<?php

namespace App\Console\Commands;

use App\Models\CommissionLog;
use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckCommission extends Command
{
    protected $signature = 'check:commission';

    protected $description = '返佣服务';

    public function handle()
    {
        $this->autoCheck();
        $this->autoPayCommission();
    }

    public function autoCheck()
    {
        if ((int)admin_setting('commission_auto_check_enable', 1)) {
            $cutoff = strtotime('-3 day', time());
            Order::where('commission_status', 0)
                ->where('invite_user_id', '!=', NULL)
                ->where('status', Order::STATUS_COMPLETED)
                ->where(function ($query) use ($cutoff) {
                    $query->where(function ($q) use ($cutoff) {
                        $q->whereNotNull('paid_at')->where('paid_at', '<=', $cutoff);
                    })->orWhere(function ($q) use ($cutoff) {
                        $q->whereNull('paid_at')->where('updated_at', '<=', $cutoff);
                    });
                })
                ->update([
                    'commission_status' => 1
                ]);
        }
    }

    public function autoPayCommission()
    {
        $orderIds = Order::where('commission_status', 1)
            ->where('invite_user_id', '!=', NULL)
            ->where('status', Order::STATUS_COMPLETED)
            ->pluck('id');

        foreach ($orderIds as $orderId) {
            try {
                DB::beginTransaction();
                $order = Order::where('id', $orderId)->lockForUpdate()->first();
                if (!$order || (int) $order->commission_status !== 1 || !$order->invite_user_id) {
                    DB::rollBack();
                    continue;
                }

                $expectedTotal = (int) $order->commission_balance;
                if ($expectedTotal <= 0) {
                    $order->commission_status = 2;
                    $order->actual_commission_balance = 0;
                    $order->save();
                    DB::commit();
                    continue;
                }
                $paidTotal = (int) CommissionLog::where('trade_no', $order->trade_no)->sum('get_amount');
                if ($paidTotal >= $expectedTotal && $expectedTotal > 0) {
                    $order->commission_status = 2;
                    $order->actual_commission_balance = $paidTotal;
                    $order->save();
                    DB::commit();
                    continue;
                }
                if ($paidTotal > 0 && $paidTotal < $expectedTotal) {
                    Log::warning('Commission payout incomplete for order ' . $orderId, [
                        'paid' => $paidTotal,
                        'expected' => $expectedTotal,
                    ]);
                    $remainder = $expectedTotal - $paidTotal;
                    $directInviter = User::where('id', $order->invite_user_id)->lockForUpdate()->first();
                    if ($directInviter && $remainder > 0) {
                        if ((int) admin_setting('withdraw_close_enable', 0)) {
                            $directInviter->increment('balance', $remainder);
                        } else {
                            $directInviter->increment('commission_balance', $remainder);
                        }
                        if ($directInviter->save()) {
                            CommissionLog::create([
                                'invite_user_id' => $order->invite_user_id,
                                'user_id' => $order->user_id,
                                'trade_no' => $order->trade_no,
                                'order_amount' => $order->total_amount,
                                'get_amount' => $remainder,
                            ]);
                            $paidTotal += $remainder;
                        }
                    }
                    $order->commission_status = 2;
                    $order->actual_commission_balance = $paidTotal;
                    $order->save();
                    DB::commit();
                    continue;
                }

                if (!$this->payHandle($order->invite_user_id, $order)) {
                    DB::rollBack();
                    continue;
                }
                $order->commission_status = 2;
                if (!$order->save()) {
                    DB::rollBack();
                    continue;
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Commission payout failed for order ' . $orderId, ['error' => $e->getMessage()]);
                continue;
            }
        }
    }

    public function payHandle($inviteUserId, Order $order)
    {
        $level = 3;
        if ((int)admin_setting('commission_distribution_enable', 0)) {
            $commissionShareLevels = [
                0 => (int)admin_setting('commission_distribution_l1'),
                1 => (int)admin_setting('commission_distribution_l2'),
                2 => (int)admin_setting('commission_distribution_l3')
            ];
        } else {
            $commissionShareLevels = [
                0 => 100
            ];
        }

        $remaining = (int) $order->commission_balance;
        for ($l = 0; $l < $level; $l++) {
            if ($remaining <= 0) {
                break;
            }
            $inviter = User::where('id', $inviteUserId)->lockForUpdate()->first();
            if (!$inviter) {
                break;
            }
            if (!isset($commissionShareLevels[$l])) {
                continue;
            }
            $commissionBalance = (int) round($order->commission_balance * ($commissionShareLevels[$l] / 100));
            if ($commissionBalance <= 0) {
                $inviteUserId = $inviter->invite_user_id;
                continue;
            }
            $commissionBalance = min($commissionBalance, $remaining);
            $remaining -= $commissionBalance;

            if ((int)admin_setting('withdraw_close_enable', 0)) {
                $inviter->increment('balance', $commissionBalance);
            } else {
                $inviter->increment('commission_balance', $commissionBalance);
            }
            if (!$inviter->save()) {
                return false;
            }
            CommissionLog::create([
                'invite_user_id' => $inviteUserId,
                'user_id' => $order->user_id,
                'trade_no' => $order->trade_no,
                'order_amount' => $order->total_amount,
                'get_amount' => $commissionBalance
            ]);
            $inviteUserId = $inviter->invite_user_id;
            $order->actual_commission_balance = (int) $order->actual_commission_balance + $commissionBalance;
        }

        if ($remaining > 0) {
            $directInviter = User::where('id', $order->invite_user_id)->lockForUpdate()->first();
            if ($directInviter && $remaining > 0) {
                if ((int)admin_setting('withdraw_close_enable', 0)) {
                    $directInviter->increment('balance', $remaining);
                } else {
                    $directInviter->increment('commission_balance', $remaining);
                }
                if (!$directInviter->save()) {
                    return false;
                }
                CommissionLog::create([
                    'invite_user_id' => $order->invite_user_id,
                    'user_id' => $order->user_id,
                    'trade_no' => $order->trade_no,
                    'order_amount' => $order->total_amount,
                    'get_amount' => $remaining
                ]);
                $order->actual_commission_balance = (int) $order->actual_commission_balance + $remaining;
                $remaining = 0;
            }
        }

        if ($remaining > 0) {
            Log::warning('Commission payout left unallocated remainder for order ' . $order->id, [
                'remaining' => $remaining,
                'expected' => (int) $order->commission_balance,
            ]);
            return false;
        }

        return (int) $order->actual_commission_balance > 0;
    }
}
