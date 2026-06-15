<?php

namespace App\Support;

use App\Models\CommissionLog;
use App\Models\GiftCardUsage;
use App\Models\Order;

class OnetimeCommission
{
    /**
     * Whether the invitee has already consumed their one-time commission slot
     * (paid order, pending order commission, or gift-card invite rewards).
     */
    public static function consumedByUser(int $userId): bool
    {
        if (Order::where('user_id', $userId)
            ->whereIn('status', [Order::STATUS_COMPLETED, Order::STATUS_DISCOUNTED])
            ->whereRaw('(COALESCE(total_amount, 0) + COALESCE(balance_amount, 0) + COALESCE(surplus_amount, 0)) > 0')
            ->exists()) {
            return true;
        }

        if (Order::where('user_id', $userId)
            ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_PROCESSING])
            ->whereNotNull('invite_user_id')
            ->where('commission_balance', '>', 0)
            ->exists()) {
            return true;
        }

        if (GiftCardUsage::where('user_id', $userId)->whereNotNull('invite_rewards')->exists()) {
            return true;
        }

        return CommissionLog::where('user_id', $userId)
            ->where('trade_no', 'like', 'giftcard:%')
            ->where(function ($query) {
                $query->where('get_amount', '>', 0)
                    ->orWhere('order_amount', '>', 0);
            })
            ->exists();
    }
}
