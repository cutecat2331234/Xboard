<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class OrderHandleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $order;
    protected $tradeNo;

    public $tries = 3;
    public $timeout = 120;
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
                        $orderService->cancel();
                    } elseif ($order->payment_id && $age >= 3600 * 24) {
                        $orderService->cancel();
                    }
                    break;
                case Order::STATUS_PROCESSING:
                    $orderService->open();
                    break;
            }
        });
    }
}
