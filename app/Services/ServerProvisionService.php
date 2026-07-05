<?php

namespace App\Services;

use App\Models\Server;
use App\Models\ServerMachine;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * ServerProvisionService — shared, credential-free building blocks for SSH auto-provisioning.
 *
 * Splits the reusable pieces out of MachineController so the provisioning Job can:
 *  - resolve the installer URL / panel URL the same way the manual one-click command does,
 *  - build the install.sh invocation (machine mode), and
 *  - create the v2_server record bound to a machine (mirrors ManageController::save semantics).
 *
 * No SSH and no credentials live here.
 */
class ServerProvisionService
{
    /**
     * Resolve the panel URL exactly like MachineController does: prefer the configured
     * app_url (cannot be spoofed via Host header), fall back to the request host.
     */
    public static function panelUrl(): string
    {
        return rtrim((string) (admin_setting('app_url') ?: config('app.url')), '/');
    }

    /**
     * Resolve the installer URL — same logic as MachineController::nodeInstallerUrl().
     * Used for the fallback "curl | bash" path on machines that can reach GitHub.
     */
    public static function installerUrl(): string
    {
        if (is_file(base_path('xboard-node/install.sh'))) {
            $repo = (string) config('xboard.node_installer_repository', 'https://raw.githubusercontent.com/cutecat2331234/Xboard/master');

            return rtrim($repo, '/') . '/xboard-node/install.sh';
        }

        return 'https://raw.githubusercontent.com/cedar2025/xboard-node/dev/install.sh';
    }

    /**
     * Read the bundled install.sh body (preferred: stream over stdin so the target machine
     * does not need to curl GitHub and we run exactly the repo-pinned version).
     *
     * @return string|null null if the repo copy is not present (caller should fall back to curl).
     */
    public static function installerScriptBody(): ?string
    {
        $path = base_path('xboard-node/install.sh');
        if (!is_file($path)) {
            return null;
        }
        $body = @file_get_contents($path);

        return $body === false ? null : $body;
    }

    /**
     * Build the install.sh argument string for machine mode (no interpreter, no script path).
     *
     * Token is passed as a CLI arg (briefly visible in the remote process list — acceptable
     * and identical to the documented manual one-click command). The panel URL and token are
     * escaped; the machine id is an integer.
     */
    public static function buildMachineInstallArgs(ServerMachine $machine, string $kernel = 'singbox'): string
    {
        $panelUrl = self::panelUrl();
        $kernel = in_array($kernel, ['singbox', 'xray'], true) ? $kernel : 'singbox';

        return sprintf(
            '--mode machine --panel %s --token %s --machine-id %d --kernel %s --yes',
            escapeshellarg($panelUrl),
            escapeshellarg($machine->token),
            $machine->id,
            escapeshellarg($kernel)
        );
    }

    /**
     * Privilege-elevation prefix for installer commands.
     *
     * - root (uid 0): empty string — run directly (a minimal image may not even ship `sudo`).
     * - non-root with passwordless sudo: "sudo -n " — `-n` keeps it non-interactive so it can
     *   never block on a password prompt over the TTY-less exec channel (the probe step already
     *   verified `sudo -n true` succeeds before we get here).
     */
    private static function sudoPrefix(bool $useSudo): string
    {
        return $useSudo ? 'sudo -n ' : '';
    }

    /**
     * Full remote invocation when streaming the bundled script over stdin.
     * "__SCRIPT__" is a placeholder ProvisioningService::runScript() replaces with the temp path.
     * Set $useSudo when the SSH user is not root but has passwordless sudo.
     */
    public static function buildStdinInvocation(ServerMachine $machine, string $kernel = 'singbox', bool $useSudo = false): string
    {
        // env XBOARD_NODE_REQUIRE_CHECKSUM=1: 强制 install.sh 校验下发二进制的 SHA256
        // (脚本默认 REQUIRE_CHECKSUM=0 仅告警)。用 `env` 命令确保变量能穿透 sudo。
        return self::sudoPrefix($useSudo) . 'env XBOARD_NODE_REQUIRE_CHECKSUM=1 bash __SCRIPT__ ' . self::buildMachineInstallArgs($machine, $kernel);
    }

    /**
     * Full remote command for the curl|bash fallback (machine can reach GitHub).
     * Set $useSudo when the SSH user is not root but has passwordless sudo.
     */
    public static function buildCurlInstallCommand(ServerMachine $machine, string $kernel = 'singbox', bool $useSudo = false): string
    {
        // 见 buildStdinInvocation:同样强制 install.sh 做 SHA256 完整性校验。
        return sprintf(
            'curl -fsSL %s | %senv XBOARD_NODE_REQUIRE_CHECKSUM=1 bash -s -- %s',
            escapeshellarg(self::installerUrl()),
            self::sudoPrefix($useSudo),
            self::buildMachineInstallArgs($machine, $kernel)
        );
    }

    /**
     * Find an existing machine for this host (idempotency) or create a fresh one.
     * "Existing" is matched by an explicit machine_id when supplied; otherwise a new machine
     * is created. We deliberately do NOT auto-match by host because a host string is not stored
     * on the machine record — the caller (Job) owns dedupe-by-host via a cache lock.
     */
    public static function resolveOrCreateMachine(?int $machineId, string $name, ?string $notes = null): ServerMachine
    {
        if ($machineId) {
            $machine = ServerMachine::find($machineId);
            if ($machine) {
                return $machine;
            }
        }

        return ServerMachine::create([
            'name' => $name,
            'notes' => $notes,
            'is_active' => true,
            'token' => ServerMachine::generateToken(),
        ]);
    }

    /**
     * Columns the provisioner is allowed to set on a new v2_server, mirroring the node_params.*
     * rules in ProvisionStart (which reuse ServerSave::getBaseRules() + protocol_settings) intersected
     * with actual v2_server columns. Server uses $guarded = ['id'], so we MUST whitelist explicitly
     * rather than blacklist — otherwise any extra validated key would be written as a real column.
     *
     * Excluded on purpose: id (auto), kernel (installer-only, not a column), spectific_key (not a
     * column; the column is `code`), and the server-forced machine_id/enabled/show (set below).
     */
    private const ALLOWED_SERVER_COLUMNS = [
        'type',
        'code',
        'name',
        'group_ids',
        'route_ids',
        'parent_id',
        'host',
        'port',
        'server_port',
        'tags',
        'rate',
        'rate_time_enable',
        'rate_time_ranges',
        'custom_outbounds',
        'custom_routes',
        'cert_config',
        'protocol_settings',
        'transfer_enable',
        'sort',
    ];

    /**
     * Create a v2_server bound to a machine, from a validated node_params payload.
     *
     * $nodeParams must already be validated (same shape as ServerSave validated output).
     * Mirrors ManageController::save() create path: Server::create($params). machine_id and
     * enabled are forced here.
     */
    public static function createServerForMachine(int $machineId, array $nodeParams): Server
    {
        // Explicit allow-list: only known, validated Server columns survive. This prevents any
        // attacker-influenced extra key in node_params from being passed through to Server::create()
        // (which is $guarded = ['id'] and would otherwise treat stray keys as real columns).
        $params = Arr::only($nodeParams, self::ALLOWED_SERVER_COLUMNS);

        // Server-owned fields are forced here and can never be supplied by the caller.
        $params['machine_id'] = $machineId;
        // Default to enabled + hidden until the operator confirms it; mirrors "show" default false.
        if (!array_key_exists('enabled', $params)) {
            $params['enabled'] = true;
        }
        if (!array_key_exists('show', $params)) {
            $params['show'] = false;
        }

        return DB::transaction(function () use ($params) {
            return Server::create($params);
        });
    }
}
