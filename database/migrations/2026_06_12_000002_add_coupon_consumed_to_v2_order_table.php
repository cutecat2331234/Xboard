<?php

use App\Models\Coupon;
use App\Models\Order;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('v2_order', 'coupon_consumed')) {
            Schema::table('v2_order', function (Blueprint $table) {
                $table->boolean('coupon_consumed')->default(false)->after('coupon_id');
            });
        }

        // Legacy: coupon limit_use was decremented at order create — restore for unpaid orders.
        Order::query()
            ->whereNotNull('coupon_id')
            ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_CANCELLED])
            ->whereNull('paid_at')
            ->each(function (Order $order) {
                Coupon::where('id', $order->coupon_id)
                    ->whereNotNull('limit_use')
                    ->increment('limit_use');
            });

        Order::query()
            ->whereNotNull('coupon_id')
            ->where(function ($query) {
                $query->whereNotNull('paid_at')
                    ->orWhereIn('status', [
                        Order::STATUS_COMPLETED,
                        Order::STATUS_DISCOUNTED,
                        Order::STATUS_PROCESSING,
                    ]);
            })
            ->update(['coupon_consumed' => true]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('v2_order', 'coupon_consumed')) {
            Schema::table('v2_order', function (Blueprint $table) {
                $table->dropColumn('coupon_consumed');
            });
        }
    }
};
