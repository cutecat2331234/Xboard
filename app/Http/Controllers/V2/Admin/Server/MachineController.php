<?php

namespace App\Http\Controllers\V2\Admin\Server;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\ServerMachine;
use App\Models\ServerMachineLoadHistory;
use App\Services\NodeSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class MachineController extends Controller
{
    /**
     * 获取机器列表（附带关联节点数）
     */
    public function fetch(Request $request)
    {
        $machines = ServerMachine::withCount('servers')
            ->orderBy('id')
            ->get()
            ->map(function (ServerMachine $machine) {
                return [
                    'id' => $machine->id,
                    'name' => $machine->name,
                    'notes' => $machine->notes,
                    'is_active' => $machine->is_active,
                    'last_seen_at' => $machine->last_seen_at,
                    'load_status' => $machine->load_status,
                    'servers_count' => $machine->servers_count,
                    'created_at' => $machine->created_at,
                    'updated_at' => $machine->updated_at,
                ];
            });

        return $this->success($machines);
    }

    /**
     * 创建 / 更新机器
     */
    public function save(Request $request)
    {
        $params = $request->validate([
            'id' => 'nullable|integer|exists:v2_server_machine,id',
            'name' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            return DB::transaction(function () use ($params, $request) {
                if (!empty($params['id'])) {
                    $machine = ServerMachine::where('id', $params['id'])->lockForUpdate()->first();
                    if (!$machine) {
                        return $this->fail([404, __('Server machine does not exist')]);
                    }
                    $update = ['name' => $params['name']];
                    if (array_key_exists('notes', $params)) {
                        $update['notes'] = $params['notes'];
                    }
                    if (array_key_exists('is_active', $params)) {
                        $update['is_active'] = $params['is_active'];
                    }
                    $machine->update($update);
                    return $this->success(true);
                }

                $machine = ServerMachine::create([
                    'name' => $params['name'],
                    'notes' => $params['notes'] ?? null,
                    'is_active' => $params['is_active'] ?? true,
                    'token' => ServerMachine::generateToken(),
                ]);

                return $this->success([
                    'id' => $machine->id,
                    'token' => $machine->token,
                    'install_command' => $this->buildInstallCommand($request, $machine),
                ]);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    /**
     * 重置机器 Token
     */
    public function resetToken(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_machine,id',
        ]);

        try {
            return DB::transaction(function () use ($params, $request) {
                $machine = ServerMachine::where('id', $params['id'])->lockForUpdate()->first();
                if (!$machine) {
                    return $this->fail([404, __('Server machine does not exist')]);
                }
                $token = ServerMachine::generateToken();
                $machine->update(['token' => $token]);

                return $this->success(['token' => $token]);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    /**
     * 获取机器 Token（仅展示一次，用于首次配置）
     */
    public function getToken(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_machine,id',
        ]);

        $rateKey = 'machine-get-token:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($rateKey, 20)) {
            return $this->fail([429, __('Too many attempts')]);
        }
        RateLimiter::hit($rateKey, 3600);

        $machine = ServerMachine::find($params['id']);

        return $this->success(['token' => $machine->token]);
    }

    /**
     * 获取机器模式一键安装命令
     */
    public function installCommand(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_machine,id',
        ]);

        $machine = ServerMachine::find($params['id']);

        return $this->success([
            'command' => $this->buildInstallCommand($request, $machine),
        ]);
    }

    /**
     * 删除机器（自动解除关联节点）
     */
    public function drop(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|integer|exists:v2_server_machine,id',
        ]);

        try {
            return DB::transaction(function () use ($params) {
                $machine = ServerMachine::where('id', $params['id'])->lockForUpdate()->first();
                if (!$machine) {
                    return $this->fail([404, __('Server machine does not exist')]);
                }
                $machineId = $machine->id;

                Server::where('machine_id', $machineId)->update(['machine_id' => null]);
                $machine->delete();

                NodeSyncService::notifyMachineNodesChanged($machineId);

                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }

    /**
     * 获取机器下的节点列表
     */
    public function nodes(Request $request)
    {
        $params = $request->validate([
            'machine_id' => 'required|integer|exists:v2_server_machine,id',
        ]);

        $nodes = Server::where('machine_id', $params['machine_id'])
            ->orderBy('sort')
            ->get(['id', 'name', 'type', 'host', 'port', 'show', 'enabled', 'sort']);

        return $this->success($nodes);
    }

    /**
     * 获取机器负载历史
     */
    public function history(Request $request)
    {
        $params = $request->validate([
            'machine_id' => 'required|integer|exists:v2_server_machine,id',
            'limit' => 'nullable|integer|min:10|max:1440',
            'range_hours' => 'nullable|integer|min:1|max:24',
        ]);

        $query = ServerMachineLoadHistory::query()
            ->where('machine_id', $params['machine_id']);

        if (!empty($params['range_hours'])) {
            $query->where('recorded_at', '>=', now()->subHours((int) $params['range_hours'])->timestamp);
        }

        $limit = (int) ($params['limit'] ?? 60);

        $history = $query
            ->orderByDesc('recorded_at')
            ->limit($limit)
            ->get([
                'cpu',
                'mem_total',
                'mem_used',
                'disk_total',
                'disk_used',
                'net_in_speed',
                'net_out_speed',
                'recorded_at',
            ])
            ->reverse()
            ->values();

        return $this->success($history);
    }

    private function buildInstallCommand(Request $request, ServerMachine $machine): string
    {
        $panelUrl = rtrim((string) (admin_setting('app_url') ?: $request->getSchemeAndHttpHost()), '/');
        $installerUrl = $this->nodeInstallerUrl();

        return sprintf(
            'curl -fsSL %s | sudo bash -s -- --mode machine --panel %s --token %s --machine-id %d',
            $installerUrl,
            escapeshellarg($panelUrl),
            escapeshellarg($machine->token),
            $machine->id
        );
    }

    private function nodeInstallerUrl(): string
    {
        if (is_file(base_path('xboard-node/install.sh'))) {
            $repo = (string) config('xboard.node_installer_repository', 'https://raw.githubusercontent.com/cutecat2331234/Xboard/master');

            return rtrim($repo, '/') . '/xboard-node/install.sh';
        }

        return 'https://raw.githubusercontent.com/cedar2025/xboard-node/dev/install.sh';
    }
}
