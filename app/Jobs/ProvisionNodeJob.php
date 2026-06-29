<?php

namespace App\Jobs;

use App\Models\Server;
use App\Models\ServerMachine;
use App\Models\ServerProvisioning;
use App\Exceptions\ProvisioningHaltException;
use App\Services\NodeSyncService;
use App\Services\ProvisioningService;
use App\Services\ServerProvisionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

/**
 * ProvisionNodeJob — SSH auto node-provisioning state machine (Phase 1, machine mode).
 *
 * Flow: connect -> probe -> prepare_panel -> install_agent -> create_server -> wait_online -> done.
 * Each step updates the v2_server_provisioning row (status + steps + redacted log). On failure the
 * row is marked failed (or timeout for wait_online) with a redacted reason; records are KEPT for
 * manual triage (no auto-rollback in Phase 1).
 *
 * CREDENTIALS — "not on disk / not persisted":
 *  - The HTTP controller writes the SSH secret into a SHORT-TTL ENCRYPTED cache entry
 *    (Crypt::encrypt, APP_KEY) keyed by a random token, and dispatches this job with ONLY the
 *    provisioning id + that cache key. So the job's serialized payload in Redis carries NO secret.
 *  - handle() decrypts the entry into a local variable, and Cache::forget()s it as soon as the
 *    SSH session is authenticated (or on any early failure). Credentials live only in this
 *    worker process memory for the duration of connect/auth and are never written to DB/log/disk.
 */
class ProvisionNodeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Business layer manages its own retry semantics; do not let the framework re-run the script. */
    public $tries = 1;

    /** Generous overall ceiling; must stay below Horizon retry_after for this queue. */
    public $timeout = 600;

    public function __construct(
        private readonly int $provisioningId,
        private readonly string $credentialCacheKey,
    ) {
        // Dedicated connection: its retry_after (900s) exceeds this job's timeout so a slow-but-
        // alive run is never re-reserved and executed twice.
        $this->onConnection('redis-provision');
        $this->onQueue('provision');
    }

    public function handle(): void
    {
        $task = ServerProvisioning::find($this->provisioningId);
        if (!$task) {
            // Nothing to do; burn any dangling credential entry.
            Cache::forget($this->credentialCacheKey);
            return;
        }

        if ($task->isTerminal()) {
            Cache::forget($this->credentialCacheKey);
            return;
        }

        // Pull and immediately remove the encrypted credential blob. We delete first so even a
        // crash mid-job cannot leave the secret lingering past this point.
        $credentials = $this->consumeCredentials();
        if ($credentials === null) {
            $this->failTask($task, ServerProvisioning::STEP_CONNECT, 'Credentials missing or expired before provisioning started.');
            return;
        }

        // Serialize concurrent runs against the same host so two jobs don't fight over one box.
        $lock = Cache::lock('provision:host:' . $task->host, $this->timeout + 30);
        if (!$lock->get()) {
            $this->failTask($task, ServerProvisioning::STEP_CONNECT, 'Another provisioning task is already running for this host.');
            $this->wipe($credentials);
            return;
        }

        $svc = null;
        try {
            $svc = $this->stepConnect($task, $credentials);
            // Credentials are no longer needed once authenticated — burn them from memory now.
            $this->wipe($credentials);
            $credentials = null;

            $probe = $this->stepProbe($task, $svc);
            $machine = $this->stepPreparePanel($task);
            $this->stepInstallAgent($task, $svc, $machine, $probe);

            // SSH no longer required after install; close the session before waiting on health.
            $svc->disconnect();
            $svc = null;

            $server = $this->stepCreateServer($task, $machine);
            $this->stepWaitOnline($task, $machine, $server);
        } catch (ProvisioningHaltException $e) {
            // Already recorded on the task by the throwing step (failed/timeout). Nothing more to do.
        } catch (\Throwable $e) {
            // Defensive catch-all: record a redacted reason against the current step.
            $this->failTask(
                $task,
                $task->current_step ?: ServerProvisioning::STEP_CONNECT,
                ProvisioningService::redact($e->getMessage())
            );
            Log::error('[ProvisionNodeJob] ' . $e->getMessage(), ['provisioning_id' => $task->id]);
        } finally {
            if ($svc !== null) {
                $svc->disconnect();
            }
            if ($credentials !== null) {
                $this->wipe($credentials);
            }
            optional($lock)->release();
        }
    }

    /**
     * Step 1 — connect + host-key TOFU + authenticate.
     */
    private function stepConnect(ServerProvisioning $task, array $credentials): ProvisioningService
    {
        $this->beginStep($task, ServerProvisioning::STEP_CONNECT, ServerProvisioning::STATUS_CONNECTING, 'Connecting to host…');

        try {
            $svc = new ProvisioningService($task->host, $task->port);

            // TOFU: pin on first connect, verify on retries.
            $fingerprint = $svc->verifyOrPinHostKey($task->host_key_fingerprint);
            if (empty($task->host_key_fingerprint)) {
                $task->host_key_fingerprint = $fingerprint;
                $task->save();
            }

            if (($credentials['auth_method'] ?? '') === ServerProvisioning::AUTH_KEY) {
                $svc->loginWithKey(
                    $task->ssh_user,
                    (string) ($credentials['private_key'] ?? ''),
                    $credentials['passphrase'] ?? null
                );
            } else {
                $svc->loginWithPassword($task->ssh_user, (string) ($credentials['password'] ?? ''));
            }
        } catch (\Throwable $e) {
            $this->failTask($task, ServerProvisioning::STEP_CONNECT, ProvisioningService::redact($e->getMessage()));
            throw new ProvisioningHaltException();
        }

        $this->appendLog($task, 'Connected and authenticated. Host key fingerprint: ' . ($task->host_key_fingerprint ?? 'n/a'));
        $this->completeStep($task, ServerProvisioning::STEP_CONNECT);

        return $svc;
    }

    /**
     * Step 2 — probe OS / arch / systemd / privileges / whether already installed.
     *
     * Privilege model: the installer needs root. We accept either a root SSH user (uid 0) or a
     * non-root user with PASSWORDLESS sudo. When sudo is required, `use_sudo` is set so the
     * install step prefixes its (and only its) commands with `sudo -n`. Read-only probe commands
     * never use sudo.
     *
     * @return array{arch:string,os:string,has_systemd:bool,is_root:bool,use_sudo:bool,already_installed:bool}
     */
    private function stepProbe(ServerProvisioning $task, ProvisioningService $svc): array
    {
        $this->beginStep($task, ServerProvisioning::STEP_PROBE, ServerProvisioning::STATUS_PROBING, 'Probing target system…');

        // One round-trip; markers keep parsing simple and robust.
        $cmd = implode(' ; ', [
            'echo XB_ARCH=$(uname -m)',
            'echo XB_OS=$( . /etc/os-release 2>/dev/null; echo "${ID:-unknown}" )',
            'command -v systemctl >/dev/null 2>&1 && echo XB_SYSTEMD=1 || echo XB_SYSTEMD=0',
            'echo XB_UID=$(id -u)',
            'test -x /usr/local/bin/xboard-node && echo XB_INSTALLED=1 || echo XB_INSTALLED=0',
        ]);

        [$out, $exit] = $svc->runCommand($cmd, 60);

        $arch = $this->matchValue($out, 'XB_ARCH');
        $os = strtolower($this->matchValue($out, 'XB_OS'));
        $hasSystemd = $this->matchValue($out, 'XB_SYSTEMD') === '1';
        $uid = $this->matchValue($out, 'XB_UID');
        $alreadyInstalled = $this->matchValue($out, 'XB_INSTALLED') === '1';
        $isRoot = $uid === '0';

        $this->appendLog($task, ProvisioningService::redact(trim($out)));

        $supportedArch = in_array($arch, ['x86_64', 'amd64', 'aarch64', 'arm64'], true);
        $supportedOs = in_array($os, ['ubuntu', 'debian', 'centos', 'rhel', 'rocky', 'almalinux', 'fedora'], true);

        if (!$supportedArch) {
            $this->failTask($task, ServerProvisioning::STEP_PROBE, "Unsupported architecture: {$arch}");
            throw new ProvisioningHaltException();
        }
        if (!$hasSystemd) {
            $this->failTask($task, ServerProvisioning::STEP_PROBE, 'Target host is not running systemd (required by the installer).');
            throw new ProvisioningHaltException();
        }
        // Privilege: accept root directly, or a non-root user with passwordless sudo. Cloud images
        // (OCI/AWS/GCP) commonly disable root SSH and ship a NOPASSWD sudo user (opc/ubuntu/ec2-user).
        $useSudo = false;
        if (!$isRoot) {
            // `sudo -n true` is non-interactive: exit 0 iff sudo is available without a password.
            [, $sudoExit] = $svc->runCommand('sudo -n true 2>/dev/null', 30);
            if ($sudoExit === 0) {
                $useSudo = true;
                $this->appendLog($task, 'SSH user is not root; passwordless sudo detected — installer will run via sudo.');
            } else {
                $this->failTask($task, ServerProvisioning::STEP_PROBE, 'SSH user is not root and passwordless sudo is unavailable; provide a root user or a sudo-capable user with NOPASSWD.');
                throw new ProvisioningHaltException();
            }
        }
        if (!$supportedOs) {
            // Non-fatal: installer continues best-effort, but record a warning.
            $this->appendLog($task, "Warning: OS '{$os}' is outside the official support set; continuing best-effort.");
        }

        $probe = [
            'arch' => $arch,
            'os' => $os,
            'has_systemd' => $hasSystemd,
            'is_root' => $isRoot,
            'use_sudo' => $useSudo,
            'already_installed' => $alreadyInstalled,
        ];

        $this->completeStep($task, ServerProvisioning::STEP_PROBE);

        return $probe;
    }

    /**
     * Step 3 — create or reuse the machine record + hold its token in memory only.
     */
    private function stepPreparePanel(ServerProvisioning $task): ServerMachine
    {
        $this->beginStep($task, ServerProvisioning::STEP_PREPARE_PANEL, ServerProvisioning::STATUS_PREPARING, 'Preparing panel machine record…');

        $existingMachineId = data_get($task->node_params, 'machine_id');

        $machine = ServerProvisionService::resolveOrCreateMachine(
            $existingMachineId ? (int) $existingMachineId : null,
            (string) (data_get($task->node_params, 'name') ?: ('Auto ' . $task->host)),
            'Provisioned via SSH (task #' . $task->id . ')'
        );

        // Backfill linkage (never the token).
        $task->machine_id = $machine->id;
        $task->save();

        $this->appendLog($task, 'Panel machine ready (id=' . $machine->id . ').');
        $this->completeStep($task, ServerProvisioning::STEP_PREPARE_PANEL);

        return $machine;
    }

    /**
     * Step 4 — run install.sh over SSH (machine mode). Prefer streaming the bundled script via
     * stdin; fall back to curl|bash when the repo copy is unavailable.
     *
     * @param array{arch:string,os:string,has_systemd:bool,is_root:bool,use_sudo:bool,already_installed:bool} $probe
     */
    private function stepInstallAgent(ServerProvisioning $task, ProvisioningService $svc, ServerMachine $machine, array $probe): void
    {
        $this->beginStep($task, ServerProvisioning::STEP_INSTALL_AGENT, ServerProvisioning::STATUS_INSTALLING, 'Installing node agent…');

        $kernel = (string) (data_get($task->node_params, 'kernel') ?: 'singbox');
        // Elevate the installer (and only the installer) when the SSH user is a NOPASSWD sudoer.
        $useSudo = (bool) ($probe['use_sudo'] ?? false);
        $scriptBody = ServerProvisionService::installerScriptBody();

        try {
            if ($scriptBody !== null) {
                $invocation = ServerProvisionService::buildStdinInvocation($machine, $kernel, $useSudo);
                [$out, $exit] = $svc->runScript($scriptBody, $invocation, ProvisioningService::DEFAULT_COMMAND_TIMEOUT);
            } else {
                $command = ServerProvisionService::buildCurlInstallCommand($machine, $kernel, $useSudo);
                [$out, $exit] = $svc->runCommand($command, ProvisioningService::DEFAULT_COMMAND_TIMEOUT);
            }
        } catch (\Throwable $e) {
            $this->failTask($task, ServerProvisioning::STEP_INSTALL_AGENT, ProvisioningService::redact($e->getMessage(), [$machine->token]));
            throw new ProvisioningHaltException();
        }

        // Always redact the machine token out of installer output before persisting.
        $this->appendLog($task, ProvisioningService::redact(trim((string) $out), [$machine->token]));

        if ($exit !== 0) {
            $this->failTask(
                $task,
                ServerProvisioning::STEP_INSTALL_AGENT,
                'Installer exited with status ' . var_export($exit, true) . '. See log for details (installer auto-rolled back on the target).'
            );
            throw new ProvisioningHaltException();
        }

        $this->appendLog($task, 'Agent installed and service healthy on target.');
        $this->completeStep($task, ServerProvisioning::STEP_INSTALL_AGENT);
    }

    /**
     * Step 5 — create the v2_server record bound to the machine, then notify the machine so a
     * live agent discovers the new node immediately.
     */
    private function stepCreateServer(ServerProvisioning $task, ServerMachine $machine): Server
    {
        $this->beginStep($task, ServerProvisioning::STEP_CREATE_SERVER, ServerProvisioning::STATUS_CREATING, 'Creating node record…');

        // Reuse an already-created server on retry (idempotency).
        if ($task->server_id) {
            $existing = Server::find($task->server_id);
            if ($existing) {
                $this->completeStep($task, ServerProvisioning::STEP_CREATE_SERVER);
                return $existing;
            }
        }

        $nodeParams = $task->node_params ?? [];
        // machine_id is owned by us, not the snapshot.
        unset($nodeParams['machine_id'], $nodeParams['kernel']);

        try {
            $server = ServerProvisionService::createServerForMachine($machine->id, $nodeParams);
        } catch (\Throwable $e) {
            $this->failTask($task, ServerProvisioning::STEP_CREATE_SERVER, ProvisioningService::redact($e->getMessage()));
            throw new ProvisioningHaltException();
        }

        $task->server_id = $server->id;
        $task->save();

        // Let a connected agent pick up the new node without re-installing.
        NodeSyncService::notifyMachineNodesChanged($machine->id);

        $this->appendLog($task, 'Node record created (id=' . $server->id . ').');
        $this->completeStep($task, ServerProvisioning::STEP_CREATE_SERVER);

        return $server;
    }

    /**
     * Step 6 — poll until the node reports online (or the machine heartbeats), or time out.
     * Timeout is NON-fatal per Phase 1 decision: mark "timeout", keep records, allow re-check.
     */
    private function stepWaitOnline(ServerProvisioning $task, ServerMachine $machine, Server $server): void
    {
        $this->beginStep($task, ServerProvisioning::STEP_WAIT_ONLINE, ServerProvisioning::STATUS_WAITING, 'Waiting for node to come online…');

        $deadline = time() + 180; // overall wait budget
        $online = false;

        while (time() < $deadline) {
            // Fresh reads each loop (avoid stale cached attributes / heartbeat).
            $node = Server::find($server->id);
            $mach = ServerMachine::find($machine->id);

            $nodeOnline = $node && (int) $node->is_online === 1;
            $machineSeen = $mach && $mach->last_seen_at && (time() - (int) $mach->last_seen_at) < Server::CHECK_INTERVAL;

            if ($nodeOnline || $machineSeen) {
                $online = true;
                break;
            }
            sleep(5);
        }

        if (!$online) {
            // Keep the record; surface a clear, re-checkable timeout state.
            $task->current_step = ServerProvisioning::STEP_WAIT_ONLINE;
            $this->markStep($task, ServerProvisioning::STEP_WAIT_ONLINE, 'timeout');
            $task->status = ServerProvisioning::STATUS_TIMEOUT;
            $task->error = 'Node did not report online within the wait window. The agent may come up shortly — use re-check. Records kept for triage.';
            $this->appendLog($task, $task->error);
            $task->save();
            return;
        }

        $this->appendLog($task, 'Node is online.');
        $this->completeStep($task, ServerProvisioning::STEP_WAIT_ONLINE);

        $task->status = ServerProvisioning::STATUS_DONE;
        $task->current_step = null;
        $task->save();
    }

    // ---------------------------------------------------------------------
    // Credential handling
    // ---------------------------------------------------------------------

    /**
     * Read + decrypt + immediately delete the credential cache entry.
     *
     * @return array{auth_method:string,password?:string,private_key?:string,passphrase?:string}|null
     */
    private function consumeCredentials(): ?array
    {
        $blob = Cache::pull($this->credentialCacheKey); // atomic get+forget
        if (!$blob) {
            return null;
        }

        try {
            $decoded = Crypt::decrypt($blob);
        } catch (\Throwable $e) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Best-effort scrub of credential values from memory.
     */
    private function wipe(array &$credentials): void
    {
        foreach ($credentials as $k => $v) {
            $credentials[$k] = null;
        }
        unset($credentials);
    }

    // ---------------------------------------------------------------------
    // State-machine bookkeeping helpers
    // ---------------------------------------------------------------------

    private function beginStep(ServerProvisioning $task, string $step, string $status, string $message): void
    {
        $task->current_step = $step;
        $task->status = $status;
        $this->markStep($task, $step, 'running');
        $this->appendLog($task, $message);
        // Persist immediately so the UI polling /status sees progress during long-running steps.
        $task->save();
    }

    private function completeStep(ServerProvisioning $task, string $step): void
    {
        $this->markStep($task, $step, 'done');
        $task->save();
    }

    private function failTask(ServerProvisioning $task, string $step, string $reason): void
    {
        $task->current_step = $step;
        $task->status = ServerProvisioning::STATUS_FAILED;
        $this->markStep($task, $step, 'failed');
        $task->error = $reason;
        $this->appendLog($task, 'FAILED: ' . $reason);
        $task->save();
    }

    /**
     * Extract the value of a "KEY=value" marker line from probe output.
     */
    private function matchValue(string $output, string $key): string
    {
        if (preg_match('/^' . preg_quote($key, '/') . '=(.*)$/m', $output, $m)) {
            return trim($m[1]);
        }
        return '';
    }

    /**
     * Upsert a step entry in the steps[] array with status + timestamps.
     */
    private function markStep(ServerProvisioning $task, string $step, string $status): void
    {
        $steps = $task->steps ?? [];
        $now = time();

        $found = false;
        foreach ($steps as &$entry) {
            if (($entry['step'] ?? null) === $step) {
                $entry['status'] = $status;
                if ($status === 'running' && empty($entry['started_at'])) {
                    $entry['started_at'] = $now;
                }
                if (in_array($status, ['done', 'failed', 'timeout'], true)) {
                    $entry['finished_at'] = $now;
                }
                $found = true;
                break;
            }
        }
        unset($entry);

        if (!$found) {
            $steps[] = [
                'step' => $step,
                'status' => $status,
                'started_at' => $status === 'running' ? $now : null,
                'finished_at' => in_array($status, ['done', 'failed', 'timeout'], true) ? $now : null,
            ];
        }

        $task->steps = array_values($steps);
    }

    /**
     * Append a redacted, timestamped line to the task log. Caller is expected to pass already
     * non-sensitive text; we still cap total size to avoid unbounded growth.
     */
    private function appendLog(ServerProvisioning $task, string $line): void
    {
        if ($line === '') {
            return;
        }
        $stamp = '[' . date('H:i:s') . '] ';
        $existing = (string) ($task->log ?? '');
        $combined = $existing . $stamp . $line . "\n";

        // Keep the most recent ~64KB of log.
        $max = 64 * 1024;
        if (strlen($combined) > $max) {
            $combined = substr($combined, -$max);
        }
        $task->log = $combined;
    }
}
