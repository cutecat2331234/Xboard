<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\CommissionLogResource;
use App\Http\Resources\InviteCodeResource;
use App\Models\CommissionLog;
use App\Models\GiftCardUsage;
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

                for ($attempt = 0; $attempt < 10; $attempt++) {
                    $code = Helper::randomChar(8);
                    if (InviteCode::where('code', $code)->exists()) {
                        continue;
                    }
                    try {
                        InviteCode::create([
                            'user_id' => $request->user()->id,
                            'code' => $code,
                            'status' => InviteCode::STATUS_UNUSED,
                        ]);
                        return $this->success(true);
                    } catch (\Illuminate\Database\QueryException) {
                        continue;
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
        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current'),
            $request->input('page_size', 10)
        );
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
            'data' => CommissionLogResource::collection($details),
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
        $user->load(['codes' => fn ($query) => $query->orderByDesc('created_at')->limit(100)]);
        if ($user->commission_rate) {
            $commission_rate = $user->commission_rate;
        }
        $uncheck_commission_balance = 0;
        $commissionBalance = 0;
        $validCommission = 0;
        if (AppFeature::commissionEnabled()) {
            $pendingOrders = Order::where('status', Order::STATUS_COMPLETED)
                ->whereIn('commission_status', [Order::COMMISSION_STATUS_PENDING, Order::COMMISSION_STATUS_VALID])
                ->where('invite_user_id', $user->id)
                ->get(['trade_no', 'commission_balance']);
            $paidByTradeNo = CommissionLog::query()
                ->whereIn('trade_no', $pendingOrders->pluck('trade_no'))
                ->groupBy('trade_no')
                ->selectRaw('trade_no, COALESCE(SUM(get_amount), 0) as paid')
                ->pluck('paid', 'trade_no');
            $uncheck_commission_balance = 0;
            foreach ($pendingOrders as $pendingOrder) {
                $paid = (int) ($paidByTradeNo[$pendingOrder->trade_no] ?? 0);
                $uncheck_commission_balance += max(0, (int) $pendingOrder->commission_balance - $paid);
            }
            if (admin_setting('commission_distribution_enable', 0)) {
                $l1 = (int) admin_setting('commission_distribution_l1', 100);
                $uncheck_commission_balance = (int) round($uncheck_commission_balance * ($l1 / 100));
            }
            $heldGiftCard = (int) CommissionLog::where('invite_user_id', $user->id)
                ->where('trade_no', 'like', 'giftcard:%')
                ->whereNull('credited_at')
                ->get(['get_amount', 'order_amount'])
                ->sum(fn ($log) => (int) $log->get_amount > 0
                    ? (int) $log->get_amount
                    : (int) $log->order_amount);
            $uncheck_commission_balance += $heldGiftCard;
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
