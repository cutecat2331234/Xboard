<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class OrderHandleJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $order;
    protected $tradeNo;

    public $tries = 3;
    public $timeout = 120;
    public $uniqueFor = 300;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($tradeNo)
    {
        $this->onQueue('order_handle');
        $this->tradeNo = $tradeNo;
    }

    public function uniqueId(): string
    {
        return (string) $this->tradeNo;
    }

    public function backoff(): array
    {
        return [10, 30, 60];
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        DB::transaction(function () {
            $order = Order::where('trade_no', $this->tradeNo)
                ->lockForUpdate()
                ->first();
            if (!$order) {
                return;
            }
            $orderService = new OrderService($order);
            switch ($order->status) {
                case Order::STATUS_PENDING:
                    $age = time() - (int) $order->created_at;
                    if (!$order->payment_id && $age >= 3600 * 2) {
                        if (!$orderService->cancel()) {
                            throw new \RuntimeException('Failed to auto-cancel stale pending order');
                        }
                    } elseif ($order->payment_id && $age >= 3600 * 24) {
                        Log::info('Auto-cancelling stale pending order with payment method selected', [
                            'trade_no' => $order->trade_no,
                            'payment_id' => $order->payment_id,
                        ]);
                        if (!$orderService->cancel()) {
                            throw new \RuntimeException('Failed to auto-cancel stale pending order');
                        }
                    }
                    break;
                case Order::STATUS_PROCESSING:
                    if (!$order->paid_at) {
                        Log::warning('OrderHandleJob: cancelling processing order without paid_at', [
                            'trade_no' => $order->trade_no,
                        ]);
                        if (!$orderService->cancel()) {
                            throw new \RuntimeException('Failed to cancel processing order without paid_at');
                        }
                        break;
                    }
                    try {
                        $orderService->open();
                        $order->refresh();
                        if ((int) $order->status === Order::STATUS_PROCESSING) {
                            if (!$orderService->failOpenAndRefund('Order remained in processing after open')) {
                                throw new \RuntimeException('Order open failed and refund could not complete');
                            }
                        }
                    } catch (\Throwable $e) {
                        Log::error('Order open failed in OrderHandleJob', [
                            'trade_no' => $order->trade_no,
                            'error' => $e->getMessage(),
                        ]);
                        if (!$orderService->failOpenAndRefund($e->getMessage())) {
                            throw new \RuntimeException('Order open and refund both failed: ' . $e->getMessage(), 0, $e);
                        }
                    }
                    break;
            }
        });
    }
}
