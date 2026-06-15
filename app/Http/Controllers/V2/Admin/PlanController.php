<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PlanSave;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PlanController extends Controller
{
    public function fetch(Request $request)
    {
        $query = Plan::orderBy('sort', 'ASC')
            ->with([
                'group:id,name'
            ]);

        if ($request->filled('name')) {
            $name = (string) $request->input('name');
            $query->where('name', 'like', '%' . $name . '%');
        }

        $paginated = $request->filled('current') || $request->filled('pageSize');
        $withCounts = $paginated || $request->boolean('with_counts');

        if ($withCounts) {
            $query->withCount([
                'users',
                'users as active_users_count' => function ($query) {
                    $query->where(function ($q) {
                        $q->where('expired_at', '>', time())
                          ->orWhereNull('expired_at');
                    });
                }
            ]);
        }

        if ($paginated) {
            [$current, $pageSize] = Helper::paginateParams(
                $request->input('current'),
                $request->input('pageSize', 20)
            );

            return $this->paginate($query->paginate($pageSize, ['*'], 'page', $current));
        }

        return $this->success($query->limit(500)->get());
    }

    public function save(PlanSave $request)
    {
        $params = $request->validated();
        $params['transfer_enable'] = (int) $params['transfer_enable'] * 1073741824;
        
        if ($request->input('id')) {
            $plan = Plan::find($request->input('id'));
            if (!$plan) {
                return $this->fail([400202, __('Subscription plan does not exist')]);
            }
            
            DB::beginTransaction();
            try {
                if ($request->input('force_update')) {
                    User::where('plan_id', $plan->id)->update([
                        'group_id' => $params['group_id'],
                        'transfer_enable' => $params['transfer_enable'],
                        'speed_limit' => $params['speed_limit'],
                        'device_limit' => $params['device_limit'],
                    ]);
                }
                $plan->update($params);
                DB::commit();
                return $this->success(true);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error($e);
                return $this->fail([500, __('Save failed')]);
            }
        }
        if (!Plan::create($params)) {
            return $this->fail([500, __('Create failed')]);
        }
        return $this->success(true);
    }

    public function drop(Request $request)
    {
        $planId = (int) $request->input('id');

        try {
            return DB::transaction(function () use ($planId) {
                $plan = Plan::where('id', $planId)->lockForUpdate()->first();
                if (!$plan) {
                    return $this->fail([400202, __('Subscription plan does not exist')]);
                }
                if (Order::where('plan_id', $planId)->exists()) {
                    return $this->fail([400201, __('Cannot delete plan with existing orders')]);
                }
                if (User::where('plan_id', $planId)->exists()) {
                    return $this->fail([400201, __('Cannot delete plan with assigned users')]);
                }

                return $this->success($plan->delete());
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }

    public function update(Request $request)
    {
        $updateData = $request->only([
            'show',
            'renew',
            'sell'
        ]);

        $plan = Plan::find($request->input('id'));
        if (!$plan) {
            return $this->fail([400202, __('Subscription plan does not exist')]);
        }

        try {
            $plan->update($updateData);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }

        return $this->success(true);
    }

    public function sort(Request $request)
    {
        $params = $request->validate([
            'ids' => 'required|array'
        ]);

        try {
            DB::beginTransaction();
            foreach ($params['ids'] as $k => $v) {
                $plan = Plan::find($v);
                if (!$plan || !$plan->update(['sort' => $k + 1])) {
                    throw new \Exception();
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
        return $this->success(true);
    }
}
