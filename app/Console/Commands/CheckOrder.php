<?php

namespace App\Console\Commands;

use App\Jobs\OrderHandleJob;
use Illuminate\Console\Command;
use App\Models\Order;

class CheckOrder extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:order';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '订单检查任务';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $now = time();
        Order::whereIn('status', [Order::STATUS_PENDING, Order::STATUS_PROCESSING])
            ->where(function ($query) use ($now) {
                $query->where(function ($q) use ($now) {
                    $q->where('status', Order::STATUS_PENDING)
                        ->where(function ($inner) use ($now) {
                            $inner->where(function ($q2) use ($now) {
                                $q2->whereNull('payment_id')
                                    ->where('created_at', '<=', $now - 3600 * 2);
                            })->orWhere(function ($q2) use ($now) {
                                $q2->whereNotNull('payment_id')
                                    ->where('created_at', '<=', $now - 3600 * 24);
                            });
                        });
                })->orWhere(function ($q) use ($now) {
                    $q->where('status', Order::STATUS_PROCESSING)
                        ->where(function ($inner) use ($now) {
                            $inner->where(function ($q2) use ($now) {
                                $q2->whereNotNull('paid_at')
                                    ->where('paid_at', '<=', $now - 120);
                            })->orWhere(function ($q2) use ($now) {
                                $q2->whereNull('paid_at')
                                    ->where('updated_at', '<=', $now - 120);
                            });
                        });
                });
            })
            ->orderBy('created_at', 'ASC')
            ->lazyById(200)
            ->each(function ($order) {
                OrderHandleJob::dispatch($order->trade_no);
            });
    }
}
