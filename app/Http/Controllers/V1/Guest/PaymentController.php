<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Http\Request;
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

            if ($order->status === Order::STATUS_COMPLETED) {
                return true;
            }

            if ($order->status === Order::STATUS_CANCELLED) {
                Log::warning('Payment notify: ignored for cancelled order (manual refund may be required)', [
                    'trade_no' => $tradeNo,
                    'callback_no' => $callbackNo,
                ]);
                return true;
            }

            if ($order->status === Order::STATUS_PROCESSING) {
                try {
                    $statusBeforeOpen = (int) $order->status;
                    (new OrderService($order->fresh()))->open();
                    $order->refresh();
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
                    return false;
                }
            }

            if ($order->status !== Order::STATUS_PENDING) {
                return true;
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

    private function expectedAmountCents(Order $order): int
    {
        return (int) $order->total_amount + (int) ($order->handling_amount ?? 0);
    }

    private function verifyAmount(Order $order, int $notifyAmountCents): bool
    {
        return abs($this->expectedAmountCents($order) - $notifyAmountCents) <= 1;
    }
}
