<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Jobs\OrderHandleJob;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Plan;
use App\Models\TrafficResetLog;
use App\Models\User;
use App\Support\AppFeature;
use App\Support\OnetimeCommission;
use App\Services\Plugin\HookManager;
use App\Utils\Helper;
use App\Utils\CacheKey;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Services\PlanService;

class OrderService
{
    const STR_TO_TIME = [
        Plan::PERIOD_MONTHLY => 1,
        Plan::PERIOD_QUARTERLY => 3,
        Plan::PERIOD_HALF_YEARLY => 6,
        Plan::PERIOD_YEARLY => 12,
        Plan::PERIOD_TWO_YEARLY => 24,
        Plan::PERIOD_THREE_YEARLY => 36
    ];
    public $order;
    public $user;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Create an order from a request.
     *
     * @param User $user
     * @param Plan $plan
     * @param string $period
     * @param string|null $couponCode
     * @return Order
     * @throws ApiException
     */
    public static function createFromRequest(
        User $user,
        Plan $plan,
        string $period,
        ?string $couponCode = null,
    ): Order {
        $userService = app(UserService::class);
        $planService = new PlanService($plan);

        $planService->validatePurchase($user, $period);
        HookManager::call('order.create.before', [$user, $plan, $period, $couponCode]);

        return DB::transaction(function () use ($user, $plan, $period, $couponCode, $userService) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();
            if (!$lockedUser) {
                throw new ApiException(__('User not found'));
            }
            $user = $lockedUser;

            $lockedPlan = Plan::where('id', $plan->id)->lockForUpdate()->first();
            if (!$lockedPlan) {
                throw new ApiException(__('Subscription plan does not exist'));
            }
            $plan = $lockedPlan;
            (new PlanService($plan))->validatePurchase($user, $period);

            if ($userService->isNotCompleteOrderByUserId($user->id)) {
                throw new ApiException(__('You have an unpaid or pending order, please try again later or cancel it'));
            }

            $newPeriod = PlanService::getPeriodKey($period);

            $order = new Order([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'period' => $newPeriod,
                'trade_no' => Helper::generateOrderNo(),
                'total_amount' => (int) round(optional($plan->prices)[$newPeriod] * 100),
            ]);

            $orderService = new self($order);

            $orderService->setOrderType($user);

            if ($couponCode) {
                if (!\App\Support\AppFeature::couponEnabled()) {
                    throw new ApiException(__('Invalid coupon'));
                }
                $orderService->applyCoupon($couponCode);
            }

            $orderService->setVipDiscount($user);

            if ($user->balance && $order->total_amount > 0) {
                $orderService->applyBalanceToOrder($user);
            }

            $orderService->setInvite(user: $user);

            if (!$order->save()) {
                throw new ApiException(__('Failed to create order'));
            }

            HookManager::call('order.create.after', $order);
            // 兼容旧钩子
            HookManager::call('order.after_create', $order);

            OrderHandleJob::dispatch($order->trade_no);

            return $order;
        });
    }

    public function open(): void
    {
        HookManager::call('order.open.before', $this->order);

        $shouldRunEvent = DB::transaction(function () {
            $order = Order::where('id', $this->order->id)->lockForUpdate()->first();
            if (!$order) {
                throw new \RuntimeException('订单不存在');
            }
            if ((int) $order->status !== Order::STATUS_PROCESSING) {
                return false;
            }

            $plan = Plan::where('id', $order->plan_id)->lockForUpdate()->first();
            if (!$plan) {
                throw new \RuntimeException('订阅计划不存在或已删除');
            }

            if (in_array((int) $order->type, [Order::TYPE_NEW_PURCHASE, Order::TYPE_UPGRADE], true)) {
                if (!(new PlanService($plan))->hasCapacity($plan, $order)) {
                    throw new \RuntimeException(__('Current product is sold out'));
                }
            }

            $this->order = $order;
            $this->user = User::lockForUpdate()->find($order->user_id);
            if (!$this->user) {
                throw new \RuntimeException('用户不存在');
            }

            if ((int) $order->type === Order::TYPE_UPGRADE) {
                if ($this->user->expired_at !== null && (int) $this->user->expired_at > 0 && (int) $this->user->expired_at <= time()) {
                    throw new \RuntimeException(__('This subscription has expired, please change to another subscription'));
                }
            }

            if ($order->surplus_credit) {
                $userService = new UserService();
                if (!$userService->addBalance($this->user->id, (int) $order->surplus_credit)) {
                    throw new \RuntimeException('Failed to apply surplus credit to balance.');
                }
            }

            if ($order->surplus_order_ids) {
                Order::whereIn('id', $order->surplus_order_ids)
                    ->where('user_id', $order->user_id)
                    ->where('status', Order::STATUS_COMPLETED)
                    ->update(['status' => Order::STATUS_DISCOUNTED]);
            }

            match ((string) $order->period) {
                Plan::PERIOD_ONETIME => $this->buyByOneTime($plan),
                Plan::PERIOD_RESET_TRAFFIC => $this->resetUserTraffic(TrafficResetLog::SOURCE_ORDER),
                default => $this->buyByPeriod($order, $plan),
            };

            $this->setSpeedLimit($plan->speed_limit);
            $this->setDeviceLimit($plan->device_limit);

            if (!$this->user->save()) {
                throw new \RuntimeException('用户信息保存失败');
            }

            $order->status = Order::STATUS_COMPLETED;
            if (!$order->save()) {
                throw new \RuntimeException('订单信息保存失败');
            }

            return true;
        });

        if (!$shouldRunEvent) {
            return;
        }

        $order = $this->order;
        $eventId = match ((int) $order->type) {
            Order::TYPE_NEW_PURCHASE => admin_setting('new_order_event_id', 0),
            Order::TYPE_RENEWAL => admin_setting('renew_order_event_id', 0),
            Order::TYPE_UPGRADE => admin_setting('change_order_event_id', 0),
            default => 0,
        };

        if ($eventId) {
            $this->openEvent($eventId);
        }

        HookManager::call('order.open.after', $order);
    }


    public function setOrderType(User $user)
    {
        $order = $this->order;
        if ($order->period === Plan::PERIOD_RESET_TRAFFIC) {
            $order->type = Order::TYPE_RESET_TRAFFIC;
        } else if ($user->plan_id !== NULL && $order->plan_id !== $user->plan_id && ($user->expired_at > time() || $user->expired_at === NULL)) {
            if (!(int) admin_setting('plan_change_enable', 1))
                throw new ApiException(__('Plan changes are not allowed. Please contact support or open a ticket.'));
            $order->type = Order::TYPE_UPGRADE;
            if ((int) admin_setting('surplus_enable', 1)) {
                $this->getSurplusValue($user, $order);
            }
            $surplusAmount = (int) ($order->surplus_amount ?? 0);
            if ($surplusAmount >= $order->total_amount) {
                $order->surplus_credit = $surplusAmount - (int) $order->total_amount;
                $order->total_amount = 0;
            } else {
                $order->total_amount = (int) $order->total_amount - $surplusAmount;
            }
        } else if (($user->expired_at === null || $user->expired_at > time()) && $order->plan_id == $user->plan_id) { // 用户订阅未过期或按流量订阅 且购买订阅与当前订阅相同 === 续费
            $order->type = Order::TYPE_RENEWAL;
        } else { // 新购
            $order->type = Order::TYPE_NEW_PURCHASE;
        }
    }

    public function setVipDiscount(User $user)
    {
        $order = $this->order;
        $couponDiscount = (int) ($order->discount_amount ?? 0);
        $afterCoupon = max(0, (int) $order->total_amount - $couponDiscount);
        $vipDiscount = 0;
        if ($user->discount) {
            // round() 而非直接 (int) 截断：0.29 这类比例的二进制浮点误差会把
            // 100*29% 算成 28.999... 再被截成 28 分。
            $vipDiscount = (int) round($afterCoupon * ($user->discount / 100));
        }
        $order->discount_amount = $couponDiscount + $vipDiscount;
        $order->total_amount = max(0, (int) $order->total_amount - $order->discount_amount);
    }

    public function setInvite(User $user): void
    {
        if (!AppFeature::commissionEnabled() || !AppFeature::inviteEnabled()) {
            return;
        }
        $order = $this->order;
        if (!$user->invite_user_id) {
            return;
        }
        $inviter = User::find($user->invite_user_id);
        if (!$inviter || $inviter->banned) {
            return;
        }
        $order->invite_user_id = $user->invite_user_id;

        $commissionBase = (int) $order->total_amount
            + (int) ($order->balance_amount ?? 0);
        if ($commissionBase <= 0) {
            return;
        }
        $commissionType = (int) $inviter->commission_type;
        if ($commissionType === User::COMMISSION_TYPE_SYSTEM) {
            $commissionType = (bool) admin_setting('commission_first_time_enable', true) ? User::COMMISSION_TYPE_ONETIME : User::COMMISSION_TYPE_PERIOD;
        }
        $isCommission = false;
        switch ($commissionType) {
            case User::COMMISSION_TYPE_PERIOD:
                $isCommission = true;
                break;
            case User::COMMISSION_TYPE_ONETIME:
                $isCommission = !OnetimeCommission::consumedByUser((int) $user->id);
                break;
        }

        if (!$isCommission)
            return;
        if ($inviter->commission_rate) {
            $order->commission_balance = (int) round($commissionBase * ($inviter->commission_rate / 100));
        } else {
            $order->commission_balance = (int) round($commissionBase * (admin_setting('invite_commission', 10) / 100));
        }
    }

    private function getSurplusValue(User $user, Order $order)
    {
        if ($user->expired_at === NULL) {
            $lastOneTimeOrder = Order::where('user_id', $user->id)
                ->where('period', Plan::PERIOD_ONETIME)
                ->where('status', Order::STATUS_COMPLETED)
                ->orderBy('id', 'DESC')
                ->first();
            if (!$lastOneTimeOrder)
                return;
            $nowUserTraffic = Helper::transferToGB($user->transfer_enable);
            if (!$nowUserTraffic)
                return;
            $paidTotalAmount = ($lastOneTimeOrder->total_amount + $lastOneTimeOrder->balance_amount);
            if (!$paidTotalAmount)
                return;
            $trafficUnitPrice = $paidTotalAmount / $nowUserTraffic;
            $notUsedTraffic = $nowUserTraffic - Helper::transferToGB($user->u + $user->d);
            $result = $trafficUnitPrice * $notUsedTraffic;
            $order->surplus_amount = (int) ($result > 0 ? $result : 0);
            $order->surplus_order_ids = [$lastOneTimeOrder->id];
        } else {
            $orders = Order::query()
                ->where('user_id', $user->id)
                ->whereNotIn('period', [Plan::PERIOD_RESET_TRAFFIC, Plan::PERIOD_ONETIME])
                ->where('status', Order::STATUS_COMPLETED)
                ->get();

            if ($orders->isEmpty()) {
                $order->surplus_amount = 0;
                $order->surplus_order_ids = [];
                return;
            }

            $orderAmountSum = $orders->sum(fn($item) => $item->total_amount + $item->balance_amount + $item->surplus_amount - $item->surplus_credit);
            // The time basis must match the amount basis above (ALL counted orders): the ratio then
            // equals per-second-price x remaining-seconds. STR_TO_TIME values are MONTHS — convert
            // to seconds via calendar months, mirroring how getTime() extends expiry.
            $orderMonthsSum = (int) $orders->sum(fn($item) => self::STR_TO_TIME[PlanService::getPeriodKey($item->period)] ?? 0);
            $expiredAt = Carbon::createFromTimestamp((int) $user->expired_at);
            $now = now();
            if ($orderMonthsSum > 0) {
                $periodSeconds = $expiredAt->timestamp - $expiredAt->copy()->subMonths($orderMonthsSum)->timestamp;
            } else {
                $firstOrderAt = $orders->min('created_at');
                $periodSeconds = $expiredAt->timestamp - (int) $firstOrderAt;
            }
            $totalSeconds = max(1, $periodSeconds);
            $remainSeconds = max(0, $expiredAt->timestamp - $now->timestamp);
            $cycleRatio = min(1.0, max(0.0, $remainSeconds / $totalSeconds));

            $plan = Plan::find($user->plan_id);
            $currentQuotaGB = Helper::transferToGB($user->transfer_enable);
            if ($currentQuotaGB <= 0 && $plan) {
                $currentQuotaGB = (float) $plan->transfer_enable;
            }
            $usedTraffic = Helper::transferToGB($user->u + $user->d);
            $remainTraffic = max(0, $currentQuotaGB - $usedTraffic);
            $trafficRatio = $currentQuotaGB > 0
                ? min(1.0, max(0.0, $remainTraffic / $currentQuotaGB))
                : 0;

            $ratio = $cycleRatio;
            $useTrafficRatio = (int) admin_setting('surplus_traffic_ratio_enable', 0) === 1;
            if ($useTrafficRatio) {
                $ratio = min($cycleRatio, $trafficRatio);
            }


            $order->surplus_amount = (int) max(0, $orderAmountSum * $ratio);
            $order->surplus_order_ids = $orders->pluck('id')->all();
        }
    }

    public function paid(string $callbackNo)
    {
        $order = DB::transaction(function () use ($callbackNo) {
            $order = Order::where('id', $this->order->id)->lockForUpdate()->first();
            if (!$order) {
                throw new \RuntimeException('Order not found for payment callback');
            }
            $this->order = $order;

            if ((int) $order->status === Order::STATUS_PENDING) {
                $user = User::where('id', $order->user_id)->lockForUpdate()->first();
                if (!$user) {
                    throw new \RuntimeException('User not found for order payment');
                }
                $this->deductOrderBalance($user, app(UserService::class));
                $order = $this->order->fresh() ?? $this->order;
            }

            $this->order = $order;
            $this->consumeOrderCoupon();
            $order = $this->order->fresh() ?? $this->order;

            if ((int) $order->status !== Order::STATUS_PENDING) {
                return $order;
            }
            $order->status = Order::STATUS_PROCESSING;
            $order->paid_at = time();
            $order->callback_no = $callbackNo;
            if (!$order->save()) {
                throw new \RuntimeException('Failed to mark order as processing');
            }
            return $order;
        });

        if ((int) $order->status === Order::STATUS_COMPLETED) {
            return true;
        }
        if ((int) $order->status !== Order::STATUS_PROCESSING) {
            return false;
        }

        $this->order = $order->fresh() ?? $order;

        try {
            $this->open();
            $this->order->refresh();
            if ((int) $this->order->status === Order::STATUS_PROCESSING) {
                if (!$this->failOpenAndRefund('Order remained in processing after open')) {
                    throw new \RuntimeException('Order open failed and refund could not be completed');
                }
                return true;
            }
            return (int) $this->order->status === Order::STATUS_COMPLETED;
        } catch (\Throwable $e) {
            Log::error('Order open failed after payment', [
                'trade_no' => $this->order->trade_no,
                'error' => $e->getMessage(),
            ]);
            if (!$this->failOpenAndRefund($e->getMessage())) {
                throw new \RuntimeException('Order open and refund both failed: ' . $e->getMessage(), 0, $e);
            }
            return true;
        }
    }

    /**
     * Refund balance / gateway payment and cancel when subscription open fails after payment.
     */
    public function failOpenAndRefund(string $reason = ''): bool
    {
        try {
            return DB::transaction(function () use ($reason) {
                $order = Order::where('id', $this->order->id)->lockForUpdate()->first();
                if (!$order || (int) $order->status !== Order::STATUS_PROCESSING) {
                    return false;
                }
                $this->order = $order;

                $refundCents = (int) $order->balance_amount;
                if ($order->paid_at && !$this->isCompedPaymentCallback($order->callback_no)) {
                    $refundCents += (int) $order->total_amount + (int) ($order->handling_amount ?? 0);
                }

                if ($refundCents > 0) {
                    $userService = new UserService();
                    if (!$userService->addBalance($order->user_id, $refundCents)) {
                        throw new \RuntimeException('Failed to refund balance after open failure.');
                    }
                }

                if ($order->coupon_id && $order->coupon_consumed) {
                    Coupon::where('id', $order->coupon_id)
                        ->whereNotNull('limit_use')
                        ->increment('limit_use');
                    $order->coupon_consumed = false;
                }
                if ($order->balance_deducted) {
                    $order->balance_deducted = false;
                }

                $order->status = Order::STATUS_CANCELLED;
                if (!$order->save()) {
                    throw new \RuntimeException('Failed to cancel order after open failure.');
                }

                Log::error('Order open failed; refunded and cancelled', [
                    'trade_no' => $order->trade_no,
                    'refund_cents' => $refundCents,
                    'reason' => $reason,
                ]);

                HookManager::call('order.cancel.after', $order);
                Cache::forever(CacheKey::get('ORDER_OPEN_REFUNDED', $order->trade_no), $refundCents);
                return true;
            });
        } catch (\Exception $e) {
            Log::error('failOpenAndRefund failed', [
                'order_id' => $this->order->id ?? null,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Admin comp / free checkout — no gateway funds to refund as balance.
     */
    private function isCompedPaymentCallback(?string $callbackNo): bool
    {
        if ($callbackNo === null || $callbackNo === '') {
            return false;
        }
        return str_starts_with($callbackNo, 'ADMIN_ASSIGN_')
            || str_starts_with($callbackNo, 'free:')
            || $callbackNo === 'manual_operation';
    }

    public function cancel(): bool
    {
        $order = $this->order;
        HookManager::call('order.cancel.before', $order);
        try {
            return DB::transaction(function () use ($order) {
                $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->first();
                $cancellable = $lockedOrder && in_array(
                    (int) $lockedOrder->status,
                    [Order::STATUS_PENDING, Order::STATUS_PROCESSING],
                    true
                );
                if (!$cancellable) {
                    return $lockedOrder && $lockedOrder->status === Order::STATUS_CANCELLED;
                }

                if ($lockedOrder->paid_at) {
                    throw new \RuntimeException(__('You can only cancel pending orders'));
                }

                if ($lockedOrder->balance_amount && $lockedOrder->balance_deducted) {
                    $userService = new UserService();
                    if (!$userService->addBalance($lockedOrder->user_id, $lockedOrder->balance_amount)) {
                        throw new \Exception('Failed to add balance.');
                    }
                    $lockedOrder->balance_deducted = false;
                }
                if ($lockedOrder->coupon_id && $lockedOrder->coupon_consumed) {
                    Coupon::where('id', $lockedOrder->coupon_id)
                        ->whereNotNull('limit_use')
                        ->increment('limit_use');
                    $lockedOrder->coupon_consumed = false;
                }

                $lockedOrder->status = Order::STATUS_CANCELLED;
                $lockedOrder->payment_id = null;
                $lockedOrder->handling_amount = null;
                if (!$lockedOrder->save()) {
                    throw new \Exception('Failed to save order status.');
                }
                $this->order = $lockedOrder;
                HookManager::call('order.cancel.after', $lockedOrder);
                return true;
            });
        } catch (\Exception $e) {
            Log::error($e);
            return false;
        }
    }

    private function resetUserTraffic(string $source): void
    {
        app(TrafficResetService::class)->performReset($this->user, $source);
        $this->user->refresh();
    }

    private function setSpeedLimit($speedLimit)
    {
        $this->user->speed_limit = $speedLimit;
    }

    private function setDeviceLimit($deviceLimit)
    {
        $this->user->device_limit = $deviceLimit;
    }

    private function buyByPeriod(Order $order, Plan $plan)
    {
        // change plan process
        if ((int) $order->type === Order::TYPE_UPGRADE) {
            $this->user->expired_at = time();
        }
        $this->user->transfer_enable = $plan->transfer_enable * 1073741824;
        // 从一次性转换到循环或者新购的时候，重置流量
        if ($this->user->expired_at === NULL || $order->type === Order::TYPE_NEW_PURCHASE)
            $this->resetUserTraffic(TrafficResetLog::SOURCE_ORDER);
        $this->user->plan_id = $plan->id;
        $this->user->group_id = $plan->group_id;
        $this->user->expired_at = $this->getTime($order->period, $this->user->expired_at);
    }

    private function buyByOneTime(Plan $plan)
    {
        $this->resetUserTraffic(TrafficResetLog::SOURCE_ORDER);
        $this->user->transfer_enable = $plan->transfer_enable * 1073741824;
        $this->user->plan_id = $plan->id;
        $this->user->group_id = $plan->group_id;
        $this->user->expired_at = NULL;
    }

    /**
     * 计算套餐到期时间
     * @param string $periodKey
     * @param int $timestamp
     * @return int
     * @throws ApiException
     */
    private function getTime(string $periodKey, ?int $timestamp = null): int
    {
        $timestamp = ($timestamp === null || $timestamp < time()) ? time() : $timestamp;
        $periodKey = PlanService::getPeriodKey($periodKey);

        if (isset(self::STR_TO_TIME[$periodKey])) {
            $months = self::STR_TO_TIME[$periodKey];
            return Carbon::createFromTimestamp($timestamp)->addMonths($months)->timestamp;
        }

        throw new ApiException(__('Invalid plan period'));
    }

    private function openEvent($eventId)
    {
        switch ((int) $eventId) {
            case 0:
                break;
            case 1:
                $this->resetUserTraffic(TrafficResetLog::SOURCE_ORDER);
                break;
        }
    }

    protected function applyCoupon(string $couponCode): void
    {
        $couponService = CouponService::lockByCode($couponCode);
        if (!$couponService->applyToOrder($this->order)) {
            throw new ApiException(__('Coupon failed'));
        }
        $this->order->coupon_id = $couponService->getId();
        $this->order->coupon_consumed = false;
    }

    /**
     * Consume coupon global limit at checkout (idempotent).
     */
    public function consumeOrderCoupon(): void
    {
        if ($this->order->coupon_consumed || !$this->order->coupon_id) {
            return;
        }

        $coupon = Coupon::where('id', $this->order->coupon_id)->lockForUpdate()->first();
        if (!$coupon) {
            throw new ApiException(__('Invalid coupon'));
        }

        $couponService = new CouponService($coupon);
        $couponService->setPlanId($this->order->plan_id);
        $couponService->setUserId($this->order->user_id);
        $couponService->setPeriod($this->order->period);
        $couponService->check();

        if (!$couponService->consumeLimit()) {
            throw new ApiException(__('This coupon is no longer available'));
        }

        $this->order->coupon_consumed = true;
        if (!$this->order->save()) {
            throw new ApiException(__('Request failed, please try again later'));
        }
    }

    /**
     * Reserve balance on the order without debiting the user wallet until checkout.
     */
    protected function applyBalanceToOrder(User $user): void
    {
        $remainingBalance = $user->balance - $this->order->total_amount;

        if ($remainingBalance >= 0) {
            $this->order->balance_amount = $this->order->total_amount;
            $this->order->total_amount = 0;
        } else {
            $this->order->balance_amount = $user->balance;
            $this->order->total_amount = $this->order->total_amount - $user->balance;
        }
        $this->order->balance_deducted = false;
    }

    /**
     * Debit wallet balance at checkout (idempotent).
     */
    public function deductOrderBalance(User $user, UserService $userService): void
    {
        if ($this->order->balance_deducted || !(int) $this->order->balance_amount) {
            return;
        }

        $amount = (int) $this->order->balance_amount;
        if ($user->balance < $amount) {
            throw new ApiException(__('Insufficient balance'));
        }
        if (!$userService->addBalance($this->order->user_id, -$amount)) {
            throw new ApiException(__('Insufficient balance'));
        }
        $this->order->balance_deducted = true;
        if (!$this->order->save()) {
            throw new ApiException(__('Request failed, please try again later'));
        }
    }

    /**
     * Undo checkout reservation when gateway initiation fails (balance + coupon + payment lock).
     */
    public function revertCheckoutReservation(): bool
    {
        try {
            return DB::transaction(function () {
                $order = Order::where('id', $this->order->id)->lockForUpdate()->first();
                if (!$order || (int) $order->status !== Order::STATUS_PENDING || $order->paid_at) {
                    return false;
                }
                $this->order = $order;

                if ($order->balance_deducted && (int) $order->balance_amount) {
                    $userService = app(UserService::class);
                    if (!$userService->addBalance($order->user_id, (int) $order->balance_amount)) {
                        throw new \RuntimeException('Failed to restore balance after checkout failure');
                    }
                    $order->balance_deducted = false;
                }

                if ($order->coupon_consumed && $order->coupon_id) {
                    Coupon::where('id', $order->coupon_id)
                        ->whereNotNull('limit_use')
                        ->increment('limit_use');
                    $order->coupon_consumed = false;
                }

                $order->payment_id = null;
                $order->handling_amount = null;
                if (!$order->save()) {
                    throw new \RuntimeException('Failed to save order after checkout revert');
                }

                return true;
            });
        } catch (\Throwable $e) {
            Log::error('revertCheckoutReservation failed', [
                'order_id' => $this->order->id ?? null,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
