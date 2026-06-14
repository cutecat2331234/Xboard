<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\ComissionLogResource;
use App\Http\Resources\InviteCodeResource;
use App\Models\CommissionLog;
use App\Models\InviteCode;
use App\Models\Order;
use App\Models\User;
use App\Support\AppFeature;
use App\Utils\Helper;
use Illuminate\Http\Request;

class InviteController extends Controller
{
    public function save(Request $request)
    {
        if (!AppFeature::inviteEnabled()) {
            return $this->fail([403, __('Invalid invitation code')]);
        }
        if (InviteCode::where('user_id', $request->user()->id)->where('status', 0)->count() >= admin_setting('invite_gen_limit', 5)) {
            return $this->fail([400,__('The maximum number of creations has been reached')]);
        }
        $inviteCode = new InviteCode();
        $inviteCode->user_id = $request->user()->id;
        $inviteCode->code = Helper::randomChar(8);
        if (!$inviteCode->save()) {
            return $this->fail([500, __('Save failed')]);
        }
        return $this->success(true);
    }

    public function details(Request $request)
    {
        if (!AppFeature::commissionEnabled()) {
            return $this->fail([403, __('Unsupported withdraw')]);
        }
        $current = $request->input('current') ? $request->input('current') : 1;
        $pageSize = $request->input('page_size') >= 10 ? $request->input('page_size') : 10;
        $builder = CommissionLog::where('invite_user_id', $request->user()->id)
            ->where('get_amount', '>', 0)
            ->where('trade_no', 'not like', 'transfer:%')
            ->orderBy('created_at', 'DESC');
        $total = $builder->count();
        $details = $builder->forPage($current, $pageSize)
            ->get();
        return $this->success([
            'data' => ComissionLogResource::collection($details),
            'total' => $total,
            'current_page' => (int) $current,
            'page_size' => (int) $pageSize,
        ]);
    }

    public function fetch(Request $request)
    {
        if (!AppFeature::inviteEnabled()) {
            return $this->fail([403, __('Invalid invitation code')]);
        }
        $commission_rate = admin_setting('invite_commission', 10);
        $user = User::find($request->user()->id);
        if (!$user) {
            return $this->fail([400, __('User does not exist')]);
        }
        $user->load(['codes' => fn($query) => $query->where('status', 0)]);
        if ($user->commission_rate) {
            $commission_rate = $user->commission_rate;
        }
        $uncheck_commission_balance = 0;
        $commissionBalance = 0;
        $validCommission = 0;
        if (AppFeature::commissionEnabled()) {
            $uncheck_commission_balance = (int) Order::where('status', Order::STATUS_COMPLETED)
                ->whereIn('commission_status', [0, 1])
                ->where('invite_user_id', $user->id)
                ->sum('commission_balance');
            if (admin_setting('commission_distribution_enable', 0)) {
                $l1 = (int) admin_setting('commission_distribution_l1', 100);
                $uncheck_commission_balance = (int) round($uncheck_commission_balance * ($l1 / 100));
            }
            $validCommission = (int) CommissionLog::where('invite_user_id', $user->id)
                ->where('get_amount', '>', 0)
                ->where('trade_no', 'not like', 'transfer:%')
                ->sum('get_amount');
            $commissionBalance = (int) $user->commission_balance;
        }
        $stat = [
            (int)User::where('invite_user_id', $user->id)->count(),
            $validCommission,
            $uncheck_commission_balance,
            AppFeature::commissionEnabled() ? (int)$commission_rate : 0,
            $commissionBalance,
        ];
        $data = [
            'codes' => InviteCodeResource::collection($user->codes),
            'stat' => $stat
        ];
        return $this->success($data);
    }
}
