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
                'host' => $request->input('host'),
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

        ProvisionNodeJob::dispatch($task->id, $credentialKey);

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
     * stored, so the caller must resubmit them.
     */
    public function retry(ProvisionStart $request)
    {
        if (!$this->allowAttempt($request, 'provision-retry')) {
            return $this->fail([429, __('Too many attempts')]);
        }

        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_provisioning,id',
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
        if ($request->filled('host')) {
            $task->host = $request->input('host');
        }
        if ($request->filled('port')) {
            $task->port = (int) $request->input('port');
        }
        if ($request->filled('ssh_user')) {
            $task->ssh_user = (string) $request->input('ssh_user');
        }
        $task->save();

        ProvisionNodeJob::dispatch($task->id, $credentialKey);

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
        $task->error = __('Cancelled by administrator');
        $task->save();

        return $this->success(true);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

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
