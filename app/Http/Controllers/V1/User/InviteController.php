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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

class InviteController extends Controller
{
    public function save(Request $request)
    {
        if (!AppFeature::inviteEnabled()) {
            return $this->fail([403, __('Invalid invitation code')]);
        }

        $rateKey = 'invite-save:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($rateKey, 10)) {
            return $this->fail([429, __('Too many attempts')]);
        }
        RateLimiter::hit($rateKey, 60);

        try {
            return DB::transaction(function () use ($request) {
                User::where('id', $request->user()->id)->lockForUpdate()->first();
                $limit = (int) admin_setting('invite_gen_limit', 5);
                $activeCount = InviteCode::where('user_id', $request->user()->id)
                    ->where('status', InviteCode::STATUS_UNUSED)
                    ->lockForUpdate()
                    ->count();
                if ($limit > 0 && $activeCount >= $limit) {
                    throw new ApiException(__('The maximum number of creations has been reached'));
                }

                for ($attempt = 0; $attempt < 5; $attempt++) {
                    $code = Helper::randomChar(8);
                    if (InviteCode::where('code', $code)->exists()) {
                        continue;
                    }
                    $inviteCode = InviteCode::create([
                        'user_id' => $request->user()->id,
                        'code' => $code,
                        'status' => InviteCode::STATUS_UNUSED,
                    ]);
                    if ($inviteCode) {
                        return $this->success(true);
                    }
                }

                throw new ApiException(__('Save failed'));
            });
        } catch (ApiException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\Throwable $e) {
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function details(Request $request)
    {
        if (!AppFeature::commissionEnabled()) {
            return $this->fail([403, __('Unsupported withdraw')]);
        }
        $current = $request->input('current') ? $request->input('current') : 1;
        $pageSize = min(100, max(10, (int) ($request->input('page_size') ?: 10)));
        $builder = CommissionLog::where('invite_user_id', $request->user()->id)
            ->where('get_amount', '>', 0)
            ->whereNotNull('credited_at')
            ->where('trade_no', 'not like', 'transfer:%')
            ->where('trade_no', 'not like', 'withdraw:%')
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
            return $this->fail([400, __('The user does not exist')]);
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
                ->whereNotNull('credited_at')
                ->where('trade_no', 'not like', 'transfer:%')
                ->where('trade_no', 'not like', 'withdraw:%')
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
