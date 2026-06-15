<?php

namespace App\Http\Controllers\V2\Admin\Server;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Server;
use App\Models\ServerGroup;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GroupController extends Controller
{
    public function fetch(Request $request): JsonResponse
    {
        $serverGroups = ServerGroup::query()
            ->orderByDesc('id')
            ->withCount('users')
            ->get();

        // 只在需要时手动加载server_count
        $serverGroups->each(function ($group) {
            $group->setAttribute('server_count', $group->server_count);
        });

        return $this->success($serverGroups);
    }

    public function save(Request $request)
    {
        if (empty($request->input('name'))) {
            return $this->fail([422, __('Group name cannot be empty')]);
        }

        try {
            return DB::transaction(function () use ($request) {
                if ($request->input('id')) {
                    $serverGroup = ServerGroup::where('id', $request->input('id'))->lockForUpdate()->first();
                    if (!$serverGroup) {
                        return $this->fail([404, __('Group does not exist')]);
                    }
                } else {
                    $serverGroup = new ServerGroup();
                }

                $serverGroup->name = $request->input('name');
                if (!$serverGroup->save()) {
                    return $this->fail([500, __('Save failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function drop(Request $request)
    {
        $groupId = (int) $request->input('id');

        try {
            return DB::transaction(function () use ($groupId) {
                $serverGroup = ServerGroup::where('id', $groupId)->lockForUpdate()->first();
                if (!$serverGroup) {
                    return $this->fail([400202, __('Group does not exist')]);
                }
                if (Server::whereJsonContains('group_ids', $groupId)->exists()) {
                    return $this->fail([400, __('Group is used by nodes and cannot be deleted')]);
                }

                if (Plan::where('group_id', $groupId)->exists()) {
                    return $this->fail([400, __('Group is used by plans and cannot be deleted')]);
                }
                if (User::where('group_id', $groupId)->exists()) {
                    return $this->fail([400, __('Group is used by users and cannot be deleted')]);
                }
                if (!$serverGroup->delete()) {
                    return $this->fail([500, __('Delete failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }
}
