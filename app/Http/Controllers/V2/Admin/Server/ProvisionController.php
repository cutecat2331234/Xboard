<?php

namespace App\Http\Controllers\V2\Admin\Server;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProvisionStart;
use App\Jobs\ProvisionNodeJob;
use App\Models\ServerProvisioning;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Admin SSH auto node-provisioning endpoints (Phase 1).
 *
 * Security:
 *  - Lives behind the admin middleware group (secure_path prefix).
 *  - start/retry are rate-limited (anti-SSRF / anti-scan).
 *  - SSH credentials are NEVER written to the provisioning row, the log, or any response. They
 *    are stashed in a short-TTL ENCRYPTED cache entry and consumed (and deleted) by the job.
 */
class ProvisionController extends Controller
{
    /** Credential cache TTL — comfortably longer than a normal provisioning run, then auto-expires. */
    private const CREDENTIAL_TTL_SECONDS = 1200; // 20 minutes

    /**
     * POST /server/provision/start
     * Begin a provisioning task: validate, stash credentials (encrypted, short TTL), create the
     * task record, dispatch the job. Returns the provision id for the UI to poll.
     */
    public function start(ProvisionStart $request)
    {
        if (!$this->allowAttempt($request, 'provision-start')) {
            return $this->fail([429, __('Too many attempts')]);
        }

        $validated = $request->validated();
        $nodeParams = $validated['node_params'] ?? [];

        $host = $request->input('host');

        // Idempotency: if a provisioning task for this host is already in flight (non-terminal),
        // do not stack a second one — return the existing task so the UI can keep polling it. The
        // job also holds a per-host cache lock, but de-duping here avoids piling up pending rows and
        // redundant dispatches before the lock is ever contended.
        $inFlight = ServerProvisioning::query()
            ->where('host', $host)
            ->whereNotIn('status', ServerProvisioning::TERMINAL_STATUSES)
            ->orderByDesc('id')
            ->first();
        if ($inFlight) {
            return $this->success([
                'provision_id' => $inFlight->id,
                'status' => $inFlight->status,
            ]);
        }

        // Stash credentials separately from the task record — encrypted + short TTL.
        $credentialKey = $this->stashCredentials([
            'auth_method' => $request->input('auth_method'),
            'password' => $request->input('password'),
            'private_key' => $request->input('private_key'),
            'passphrase' => $request->input('passphrase'),
        ]);

        try {
            $task = ServerProvisioning::create([
                'status' => ServerProvisioning::STATUS_PENDING,
                'host' => $host,
                'port' => (int) ($request->input('port') ?: 22),
                'ssh_user' => (string) ($request->input('ssh_user') ?: 'root'),
                'auth_method' => $request->input('auth_method'),
                'mode' => ServerProvisioning::MODE_MACHINE,
                'machine_id' => $nodeParams['machine_id'] ?? null,
                'node_params' => $nodeParams,
                'created_by' => optional($request->user())->id,
                'steps' => [],
            ]);
        } catch (\Throwable $e) {
            // Never leave credentials lingering if we failed to create the task.
            Cache::forget($credentialKey);
            Log::error('[Provision] failed to create task: ' . $e->getMessage());
            return $this->fail([500, __('Create failed')]);
        }

        if (!$this->dispatchProvisionJob($task, $credentialKey)) {
            return $this->fail([500, __('Create failed')]);
        }

        return $this->success([
            'provision_id' => $task->id,
            'status' => $task->status,
        ]);
    }

    /**
     * GET /server/provision/status?id=
     * Poll a task's progress. Never returns credentials or tokens.
     */
    public function status(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_provisioning,id',
        ]);

        $task = ServerProvisioning::find($params['id']);

        return $this->success($this->presentTask($task));
    }

    /**
     * GET /server/provision/list
     * Audit history (most recent first). No credentials.
     */
    public function list(Request $request)
    {
        $params = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $limit = (int) ($params['limit'] ?? 20);

        $tasks = ServerProvisioning::query()
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn(ServerProvisioning $t) => $this->presentSummary($t));

        return $this->success($tasks);
    }

    /**
     * POST /server/provision/retry
     * Re-run a failed/timeout task from the beginning of the state machine. Credentials are NOT
     * stored, so the caller must resubmit them. Node parameters are NOT resubmitted — the task
     * row keeps its original node_params snapshot, so this deliberately does not reuse the full
     * ProvisionStart validation (which would reject the payload for lacking node_params).
     */
    public function retry(Request $request)
    {
        if (!$this->allowAttempt($request, 'provision-retry')) {
            return $this->fail([429, __('Too many attempts')]);
        }

        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_provisioning,id',
            'auth_method' => 'required|in:password,key',
            'password' => 'required_if:auth_method,password|nullable|string',
            'private_key' => 'required_if:auth_method,key|nullable|string',
            'passphrase' => 'nullable|string',
            // Hostname / IPv4 / bracketed-or-bare IPv6 only. Rejects whitespace and scheme
            // prefixes ("ssl://", "unix://") that fsockopen would honour as transport switches.
            'host' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9._\-:\[\]]+$/'],
            'port' => 'nullable|integer|min:1|max:65535',
            'ssh_user' => 'nullable|string|max:255',
        ]);

        $task = ServerProvisioning::find($params['id']);
        if (!$task) {
            return $this->fail([400202, __('Data does not exist')]);
        }
        if (!$task->isTerminal()) {
            return $this->fail([400, __('Task is still running')]);
        }

        $credentialKey = $this->stashCredentials([
            'auth_method' => $request->input('auth_method'),
            'password' => $request->input('password'),
            'private_key' => $request->input('private_key'),
            'passphrase' => $request->input('passphrase'),
        ]);

        // Reset lifecycle but keep host_key_fingerprint (TOFU) + linkage for idempotent re-run.
        $task->status = ServerProvisioning::STATUS_PENDING;
        $task->current_step = null;
        $task->error = null;
        // Refresh SSH connection facts in case the operator corrected them.
        $task->auth_method = $request->input('auth_method');
        if ($request->filled('host') && $request->input('host') !== $task->host) {
            // Different machine — the stored TOFU pin belongs to the old host; re-pin on connect.
            $task->host = $request->input('host');
            $task->host_key_fingerprint = null;
        }
        if ($request->filled('port') && (int) $request->input('port') !== (int) $task->port) {
            // The pin's identity is host:port (à la known_hosts). Behind NAT the same public IP
            // routinely port-forwards to DIFFERENT machines, so a corrected port must re-pin —
            // otherwise the retry dead-ends on a false "MITM" mismatch with no way to clear it.
            $task->port = (int) $request->input('port');
            $task->host_key_fingerprint = null;
        }
        if ($request->filled('ssh_user')) {
            $task->ssh_user = (string) $request->input('ssh_user');
        }
        $task->save();

        if (!$this->dispatchProvisionJob($task, $credentialKey)) {
            return $this->fail([500, __('Create failed')]);
        }

        return $this->success([
            'provision_id' => $task->id,
            'status' => $task->status,
        ]);
    }

    /**
     * POST /server/provision/cancel
     * Mark a non-terminal task as failed (operator abandon). Phase 1 does not perform remote
     * uninstall — created records (if any) are kept for manual cleanup via existing node/machine UI.
     */
    public function cancel(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_provisioning,id',
        ]);

        $task = ServerProvisioning::find($params['id']);
        if (!$task) {
            return $this->fail([400202, __('Data does not exist')]);
        }

        if ($task->isTerminal()) {
            return $this->success(true);
        }

        $task->status = ServerProvisioning::STATUS_FAILED;
        // A running task may have already completed some steps (e.g. installed the agent or created
        // the node record) before it observes this cancel between steps; surface that to the operator.
        $task->error = __('Cancelled by administrator. A running task may have already partially completed; review the node/machine list and clean up if needed.');
        $task->save();

        return $this->success(true);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * Queue the provisioning job; on queue-push failure burn the cached credentials and mark the
     * task failed. Without this, a queue outage (while the cache store still works) would leave
     * the encrypted secret alive until TTL and a forever-"pending" row that deadlocks the host:
     * start() keeps returning it via the in-flight dedupe and retry() refuses non-terminal tasks.
     */
    private function dispatchProvisionJob(ServerProvisioning $task, string $credentialKey): bool
    {
        try {
            ProvisionNodeJob::dispatch($task->id, $credentialKey);
            return true;
        } catch (\Throwable $e) {
            Cache::forget($credentialKey);
            Log::error('[Provision] failed to dispatch job: ' . $e->getMessage(), ['provisioning_id' => $task->id]);
            try {
                $task->status = ServerProvisioning::STATUS_FAILED;
                $task->error = __('Failed to queue the provisioning job. Check the queue worker and retry.');
                $task->save();
            } catch (\Throwable $ignored) {
                // Row left non-terminal only if even the DB write failed; nothing more we can do here.
            }
            return false;
        }
    }

    /**
     * Encrypt + cache credentials under a random key; return the key (safe to pass to the job).
     */
    private function stashCredentials(array $credentials): string
    {
        $key = 'provision:cred:' . Str::random(48);
        Cache::put($key, Crypt::encrypt($credentials), self::CREDENTIAL_TTL_SECONDS);

        return $key;
    }

    /**
     * Per-admin rate limiting for credential-bearing actions.
     */
    private function allowAttempt(Request $request, string $action): bool
    {
        $rateKey = $action . ':' . (optional($request->user())->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($rateKey, 30)) {
            return false;
        }
        RateLimiter::hit($rateKey, 3600);

        return true;
    }

    /**
     * Full task view for polling (no credentials).
     */
    private function presentTask(ServerProvisioning $task): array
    {
        return [
            'id' => $task->id,
            'status' => $task->status,
            'current_step' => $task->current_step,
            'steps' => $task->steps ?? [],
            'host' => $task->host,
            'port' => $task->port,
            'ssh_user' => $task->ssh_user,
            'auth_method' => $task->auth_method,
            'host_key_fingerprint' => $task->host_key_fingerprint,
            'mode' => $task->mode,
            'machine_id' => $task->machine_id,
            'server_id' => $task->server_id,
            'log' => $task->log,
            'error' => $task->error,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];
    }

    /**
     * Compact task view for list/audit (no log body, no credentials).
     */
    private function presentSummary(ServerProvisioning $task): array
    {
        return [
            'id' => $task->id,
            'status' => $task->status,
            'current_step' => $task->current_step,
            'host' => $task->host,
            'port' => $task->port,
            'ssh_user' => $task->ssh_user,
            'mode' => $task->mode,
            'machine_id' => $task->machine_id,
            'server_id' => $task->server_id,
            'error' => $task->error,
            'created_by' => $task->created_by,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];
    }
}
