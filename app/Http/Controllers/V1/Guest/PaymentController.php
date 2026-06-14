<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Plan;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Services\PlanService;
use App\Services\UserService;
use Illuminate\Http\Request;
use App\Utils\CacheKey;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\Plugin\HookManager;

class PaymentController extends Controller
{
    public function notify($method, $uuid, Request $request)
    {
        HookManager::call('payment.notify.before', [$method, $uuid, $request]);
        try {
            $paymentService = new PaymentService($method, null, $uuid);
            $verify = $paymentService->notify($request->input());
            if (is_string($verify)) {
                return response($verify);
            }
            if (!$verify) {
                HookManager::call('payment.notify.failed', [$method, $uuid, $request]);
                return $this->fail([422, 'verify error']);
            }
            HookManager::call('payment.notify.verified', $verify);
            if (!$this->handle($verify)) {
                return $this->fail([400, 'handle error']);
            }
            return (isset($verify['custom_result']) ? $verify['custom_result'] : 'success');
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, 'fail']);
        }
    }

    private function handle(array $verify): bool
    {
        $tradeNo = $verify['trade_no'] ?? null;
        $callbackNo = $verify['callback_no'] ?? null;
        if (!$tradeNo || !$callbackNo) {
            Log::warning('Payment notify: missing trade_no or callback_no', $verify);
            return false;
        }

        return DB::transaction(function () use ($verify, $tradeNo, $callbackNo) {
            $order = Order::where('trade_no', $tradeNo)->lockForUpdate()->first();
            if (!$order) {
                Log::warning('Payment notify: order not found', ['trade_no' => $tradeNo]);
                return false;
            }

            if (in_array((int) $order->status, [Order::STATUS_COMPLETED, Order::STATUS_DISCOUNTED], true)) {
                return $this->handleTerminalOrderNotify($order, $verify, $callbackNo);
            }

            if ($order->status === Order::STATUS_CANCELLED) {
                if ($order->paid_at) {
                    return $this->handleTerminalOrderNotify($order, $verify, $callbackNo);
                }
                if (!isset($verify['amount']) || !$this->verifyAmount($order, (int) $verify['amount'])) {
                    Log::warning('Payment notify: cancelled order with invalid amount', [
                        'trade_no' => $tradeNo,
                        'expected' => $this->expectedAmountCents($order),
                        'received' => $verify['amount'] ?? null,
                    ]);
                    return false;
                }
                return $this->reactivateCancelledOrder($order, $callbackNo);
            }

            if ($order->status === Order::STATUS_PROCESSING) {
                if (!$order->paid_at) {
                    Log::warning('Payment notify: processing order without paid_at', [
                        'trade_no' => $tradeNo,
                    ]);
                    return false;
                }
                try {
                    $statusBeforeOpen = (int) $order->status;
                    $orderService = new OrderService($order->fresh());
                    $orderService->open();
                    $order->refresh();
                    if ((int) $order->status === Order::STATUS_PROCESSING) {
                        if (!$orderService->failOpenAndRefund('Order remained in processing after payment notify retry')) {
                            $order->refresh();
                            Log::warning('Payment notify: open failed after pay, refund also failed — gateway will retry', [
                                'trade_no' => $tradeNo,
                                'paid_at' => $order->paid_at,
                            ]);
                            return false;
                        }
                        $order->refresh();
                        return (int) $order->status !== Order::STATUS_PROCESSING;
                    }
                    if (
                        $statusBeforeOpen === Order::STATUS_PROCESSING
                        && (int) $order->status === Order::STATUS_COMPLETED
                    ) {
                        HookManager::call('payment.notify.success', $order);
                    }
                    return true;
                } catch (\Throwable $e) {
                    Log::warning('Payment notify: retry open failed for processing order', [
                        'trade_no' => $tradeNo,
                        'error' => $e->getMessage(),
                    ]);
                    $orderService = new OrderService($order->fresh());
                    if ($orderService->failOpenAndRefund($e->getMessage())) {
                        return true;
                    }
                    return false;
                }
            }

            if ($order->status !== Order::STATUS_PENDING) {
                return $this->handleTerminalOrderNotify($order, $verify, $callbackNo);
            }

            if (!isset($verify['amount'])) {
                Log::warning('Payment notify: missing amount', [
                    'trade_no' => $tradeNo,
                    'expected' => $this->expectedAmountCents($order),
                ]);
                return false;
            }

            if (!$this->verifyAmount($order, (int) $verify['amount'])) {
                Log::warning('Payment notify: amount mismatch', [
                    'trade_no' => $tradeNo,
                    'expected' => $this->expectedAmountCents($order),
                    'received' => (int) $verify['amount'],
                ]);
                return false;
            }

            $orderService = new OrderService($order);
            if (!$orderService->paid($callbackNo)) {
                return false;
            }

            $order->refresh();
            if ((int) $order->status === Order::STATUS_COMPLETED) {
                HookManager::call('payment.notify.success', $order);
            }

            return true;
        });
    }

    private function reactivateCancelledOrder(Order $order, string $callbackNo): bool
    {
        if ((int) $order->type === Order::TYPE_NEW_PURCHASE) {
            $plan = Plan::find($order->plan_id);
            if ($plan && !(new PlanService($plan))->hasCapacity($plan)) {
                $this->creditOrphanPaymentOnce($order, $callbackNo, 'cancelled order reactivation blocked by sold out plan');
                return true;
            }
        }

        if ($order->balance_amount) {
            $userService = new UserService();
            if (!$userService->addBalance($order->user_id, -((int) $order->balance_amount))) {
                Log::warning('Payment notify: cannot re-deduct balance for cancelled order, crediting orphan payment', [
                    'trade_no' => $order->trade_no,
                    'balance_amount' => $order->balance_amount,
                ]);
                $this->creditOrphanPaymentOnce(
                    $order,
                    $callbackNo,
                    'cancelled order reactivation balance re-deduct failed'
                );
                return true;
            }
        }
        if ($order->coupon_id) {
            Coupon::where('id', $order->coupon_id)
                ->whereNotNull('limit_use')
                ->decrement('limit_use');
        }

        Log::info('Payment notify: reactivating cancelled order after verified payment', [
            'trade_no' => $order->trade_no,
            'callback_no' => $callbackNo,
        ]);

        $order->status = Order::STATUS_PENDING;
        if (!$order->save()) {
            return false;
        }

        $orderService = new OrderService($order);
        if (!$orderService->paid($callbackNo)) {
            return false;
        }

        $order->refresh();
        if ((int) $order->status === Order::STATUS_COMPLETED) {
            HookManager::call('payment.notify.success', $order);
        }

        return true;
    }

    private function handleTerminalOrderNotify(Order $order, array $verify, string $callbackNo): bool
    {
        if ($order->callback_no && $order->callback_no === $callbackNo) {
            return true;
        }

        Log::warning('Payment notify: duplicate or late payment for terminal order', [
            'trade_no' => $order->trade_no,
            'status' => $order->status,
            'callback_no' => $callbackNo,
            'stored_callback_no' => $order->callback_no,
        ]);

        if (isset($verify['amount']) && $this->verifyAmount($order, (int) $verify['amount'])) {
            $this->creditOrphanPaymentOnce(
                $order,
                $callbackNo,
                'terminal order status ' . $order->status
            );
        }

        return true;
    }

    private function creditOrphanPaymentOnce(Order $order, string $callbackNo, string $reason): void
    {
        $cacheKey = $this->orphanCreditCacheKey($order->trade_no, $callbackNo);
        if (Cache::has($cacheKey)) {
            Log::info('Payment notify: orphan credit already processed', [
                'trade_no' => $order->trade_no,
                'callback_no' => $callbackNo,
            ]);
            return;
        }

        if (!Cache::add($cacheKey, 1)) {
            Log::info('Payment notify: orphan credit claim skipped (concurrent)', [
                'trade_no' => $order->trade_no,
                'callback_no' => $callbackNo,
            ]);
            return;
        }

        try {
            $this->creditOrphanPayment($order, $callbackNo, $reason);
            $this->markOrphanCreditProcessed($order->trade_no, $callbackNo);
        } catch (\Throwable $e) {
            Cache::forget($cacheKey);
            throw $e;
        }
    }

    private function isOrphanCreditProcessed(string $tradeNo, string $callbackNo): bool
    {
        return Cache::has($this->orphanCreditCacheKey($tradeNo, $callbackNo));
    }

    private function markOrphanCreditProcessed(string $tradeNo, string $callbackNo): void
    {
        Cache::forever($this->orphanCreditCacheKey($tradeNo, $callbackNo), 1);
    }

    private function orphanCreditCacheKey(string $tradeNo, string $callbackNo): string
    {
        return CacheKey::get('PAYMENT_ORPHAN_CREDIT', $tradeNo . ':' . $callbackNo);
    }

    private function creditOrphanPayment(Order $order, string $callbackNo, string $reason): void
    {
        $creditCents = (int) $order->total_amount + (int) ($order->handling_amount ?? 0);
        if ($creditCents <= 0) {
            Log::warning('Payment notify: orphan payment with nothing to credit', [
                'trade_no' => $order->trade_no,
                'callback_no' => $callbackNo,
                'reason' => $reason,
            ]);
            return;
        }

        $userService = new UserService();
        if (!$userService->addBalance($order->user_id, $creditCents)) {
            Log::error('Payment notify: failed to credit orphan payment to balance', [
                'trade_no' => $order->trade_no,
                'callback_no' => $callbackNo,
                'credit_cents' => $creditCents,
                'reason' => $reason,
            ]);
            throw new \RuntimeException('Failed to credit orphan payment to balance');
        }

        Log::warning('Payment notify: credited orphan payment to user balance', [
            'trade_no' => $order->trade_no,
            'callback_no' => $callbackNo,
            'credit_cents' => $creditCents,
            'reason' => $reason,
        ]);
    }

    private function expectedAmountCents(Order $order): int
    {
        return (int) $order->total_amount + (int) ($order->handling_amount ?? 0);
    }

    private function verifyAmount(Order $order, int $notifyAmountCents): bool
    {
        return abs($this->expectedAmountCents($order) - $notifyAmountCents) <= 1;
    }
}
