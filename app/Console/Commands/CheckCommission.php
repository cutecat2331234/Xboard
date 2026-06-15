<?php

namespace App\Console\Commands;

use App\Models\CommissionLog;
use App\Support\AppFeature;
use App\Support\CommissionChain;
use App\Services\GiftCardService;
use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckCommission extends Command
{
    protected $signature = 'check:commission';

    protected $description = '返佣服务';

    private function orderAmount(Order $order): int
    {
        return (int) $order->total_amount + (int) ($order->balance_amount ?? 0);
    }

    public function handle()
    {
        if (!AppFeature::commissionEnabled()) {
            return;
        }
        $this->autoCheck();
        $this->autoPayCommission();
        $this->autoPayGiftCardCommission();
    }

    public function autoCheck()
    {
        $autoCheckEnabled = (int) admin_setting('commission_auto_check_enable', 1);

        if (!$autoCheckEnabled) {
            Order::query()
                ->where('commission_status', Order::COMMISSION_STATUS_PENDING)
                ->whereNotNull('invite_user_id')
                ->where('status', Order::STATUS_COMPLETED)
                ->orderBy('id')
                ->lazyById(200)
                ->each(function (Order $order) {
                    $status = $this->validateCommissionChain($order->invite_user_id)
                        ? Order::COMMISSION_STATUS_VALID
                        : Order::COMMISSION_STATUS_INVALID;
                    Order::where('id', $order->id)
                        ->where('commission_status', Order::COMMISSION_STATUS_PENDING)
                        ->update(['commission_status' => $status]);
                });
            return;
        }

        $cutoff = strtotime('-3 day', time());
        Order::query()
            ->where('commission_status', Order::COMMISSION_STATUS_PENDING)
            ->whereNotNull('invite_user_id')
            ->where('status', Order::STATUS_COMPLETED)
            ->where(function ($query) use ($cutoff) {
                $query->where(function ($q) use ($cutoff) {
                    $q->whereNotNull('paid_at')->where('paid_at', '<=', $cutoff);
                })->orWhere(function ($q) use ($cutoff) {
                    $q->whereNull('paid_at')->where('updated_at', '<=', $cutoff);
                });
            })
            ->orderBy('id')
            ->lazyById(200)
            ->each(function (Order $order) {
                $status = $this->validateCommissionChain($order->invite_user_id)
                    ? Order::COMMISSION_STATUS_VALID
                    : Order::COMMISSION_STATUS_INVALID;
                Order::where('id', $order->id)
                    ->where('commission_status', Order::COMMISSION_STATUS_PENDING)
                    ->update(['commission_status' => $status]);
            });
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
                    $payResult = $this->payHandleRemainder($order->invite_user_id, $order);
                    if ($payResult === 'retry') {
                        DB::rollBack();
                        continue;
                    }
                    $paidTotal = (int) CommissionLog::where('trade_no', $order->trade_no)->sum('get_amount');
                    if ($payResult === 'invalid') {
                        DB::rollBack();
                        Order::where('id', $orderId)->update(['commission_status' => Order::COMMISSION_STATUS_INVALID]);
                        continue;
                    } elseif ($paidTotal >= $expectedTotal) {
                        $order->commission_status = 2;
                        $order->actual_commission_balance = $paidTotal;
                        $order->save();
                    }
                    DB::commit();
                    continue;
                }

                $payResult = $this->payHandle($order->invite_user_id, $order);
                if ($payResult === 'invalid') {
                    DB::rollBack();
                    Order::where('id', $orderId)->update(['commission_status' => Order::COMMISSION_STATUS_INVALID]);
                    continue;
                }
                if ($payResult !== 'ok') {
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

    private function validateCommissionChain(?int $inviteUserId): bool
    {
        return CommissionChain::isValid($inviteUserId);
    }

    public function autoPayGiftCardCommission(): void
    {
        $holdEnabled = (int) admin_setting('commission_auto_check_enable', 1);
        $cutoff = $holdEnabled ? strtotime('-3 day', time()) : time();
        CommissionLog::query()
            ->where('trade_no', 'like', 'giftcard:%')
            ->whereNull('credited_at')
            ->where(function ($query) {
                $query->where('get_amount', '>', 0)
                    ->orWhere('order_amount', '>', 0);
            })
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->lazyById(200)
            ->each(function (CommissionLog $log) {
                try {
                    DB::transaction(function () use ($log) {
                        $entry = CommissionLog::where('id', $log->id)->lockForUpdate()->first();
                        if (!$entry || $entry->credited_at !== null) {
                            return;
                        }

                        $invitee = User::find($entry->user_id);
                        if (!$invitee || !$this->validateCommissionChain($invitee->invite_user_id)) {
                            $entry->update(['credited_at' => time(), 'get_amount' => 0, 'order_amount' => 0]);
                            return;
                        }

                        $inviter = User::where('id', $entry->invite_user_id)->lockForUpdate()->first();
                        if (!$inviter || $inviter->banned) {
                            $entry->update(['credited_at' => time(), 'get_amount' => 0, 'order_amount' => 0]);
                            return;
                        }

                        if ((int) $entry->get_amount > 0) {
                            GiftCardService::creditCommissionToInviter($inviter, (int) $entry->get_amount);
                        } elseif ((int) $entry->order_amount > 0) {
                            GiftCardService::creditTrafficToInviter($inviter, (int) $entry->order_amount);
                        }
                        $entry->update(['credited_at' => time()]);
                    });
                } catch (\Throwable $e) {
                    Log::error('Gift card commission payout failed', [
                        'log_id' => $log->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });
    }

    public function payHandle($inviteUserId, Order $order): string
    {
        if (!$this->validateCommissionChain($inviteUserId)) {
            return 'invalid';
        }

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
            if ($inviter->banned) {
                if ($l === 0 && (int) $inviteUserId === (int) $order->invite_user_id) {
                    return 'invalid';
                }
                $inviteUserId = (int) ($inviter->invite_user_id ?? 0);
                continue;
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
                return 'retry';
            }
            CommissionLog::create([
                'invite_user_id' => $inviteUserId,
                'user_id' => $order->user_id,
                'trade_no' => $order->trade_no,
                'order_amount' => $this->orderAmount($order),
                'get_amount' => $commissionBalance,
                'credited_at' => time(),
            ]);
            $inviteUserId = $inviter->invite_user_id;
            $order->actual_commission_balance = (int) $order->actual_commission_balance + $commissionBalance;
        }

        if ($remaining > 0) {
            $directInviter = User::where('id', $order->invite_user_id)->lockForUpdate()->first();
            if ($directInviter && $directInviter->banned) {
                return 'invalid';
            }
            if ($directInviter && $remaining > 0) {
                if ((int)admin_setting('withdraw_close_enable', 0)) {
                    $directInviter->increment('balance', $remaining);
                } else {
                    $directInviter->increment('commission_balance', $remaining);
                }
                if (!$directInviter->save()) {
                    return 'retry';
                }
                CommissionLog::create([
                    'invite_user_id' => $order->invite_user_id,
                    'user_id' => $order->user_id,
                    'trade_no' => $order->trade_no,
                    'order_amount' => $this->orderAmount($order),
                    'get_amount' => $remaining,
                    'credited_at' => time(),
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
            return 'invalid';
        }

        return 'ok';
    }

    /**
     * Resume multi-level payout for orders with partial CommissionLog history.
     */
    private function payHandleRemainder(int $inviteUserId, Order $order): string
    {
        if (!$this->validateCommissionChain($inviteUserId)) {
            return 'invalid';
        }

        $expectedTotal = (int) $order->commission_balance;
        $paidByInviter = CommissionLog::where('trade_no', $order->trade_no)
            ->selectRaw('invite_user_id, SUM(get_amount) as total')
            ->groupBy('invite_user_id')
            ->pluck('total', 'invite_user_id')
            ->map(fn ($v) => (int) $v);

        if ((int) $paidByInviter->sum() >= $expectedTotal) {
            return 'ok';
        }

        $level = 3;
        if ((int) admin_setting('commission_distribution_enable', 0)) {
            $commissionShareLevels = [
                0 => (int) admin_setting('commission_distribution_l1'),
                1 => (int) admin_setting('commission_distribution_l2'),
                2 => (int) admin_setting('commission_distribution_l3'),
            ];
        } else {
            $commissionShareLevels = [0 => 100];
        }

        $remainingBudget = $expectedTotal - (int) $paidByInviter->sum();
        for ($l = 0; $l < $level; $l++) {
            if ($remainingBudget <= 0) {
                break;
            }
            $inviter = User::where('id', $inviteUserId)->lockForUpdate()->first();
            if (!$inviter) {
                break;
            }
            if ($inviter->banned) {
                if ($l === 0 && (int) $inviteUserId === (int) $order->invite_user_id) {
                    return 'invalid';
                }
                $inviteUserId = (int) ($inviter->invite_user_id ?? 0);
                continue;
            }
            if (!isset($commissionShareLevels[$l])) {
                $inviteUserId = $inviter->invite_user_id;
                continue;
            }
            $levelShare = (int) round($expectedTotal * ($commissionShareLevels[$l] / 100));
            $alreadyGot = (int) ($paidByInviter[$inviteUserId] ?? 0);
            $payAmount = min(max(0, $levelShare - $alreadyGot), $remainingBudget);
            if ($payAmount <= 0) {
                $inviteUserId = $inviter->invite_user_id;
                continue;
            }

            if ((int) admin_setting('withdraw_close_enable', 0)) {
                $inviter->increment('balance', $payAmount);
            } else {
                $inviter->increment('commission_balance', $payAmount);
            }
            if (!$inviter->save()) {
                return 'retry';
            }
            CommissionLog::create([
                'invite_user_id' => $inviteUserId,
                'user_id' => $order->user_id,
                'trade_no' => $order->trade_no,
                'order_amount' => $this->orderAmount($order),
                'get_amount' => $payAmount,
                'credited_at' => time(),
            ]);
            $order->actual_commission_balance = (int) $order->actual_commission_balance + $payAmount;
            $remainingBudget -= $payAmount;
            $inviteUserId = $inviter->invite_user_id;
        }

        if ($remainingBudget > 0) {
            $directInviter = User::where('id', $order->invite_user_id)->lockForUpdate()->first();
            if ($directInviter && $directInviter->banned) {
                return 'invalid';
            }
            if ($directInviter && $remainingBudget > 0) {
                $payAmount = $remainingBudget;
                if ((int) admin_setting('withdraw_close_enable', 0)) {
                    $directInviter->increment('balance', $payAmount);
                } else {
                    $directInviter->increment('commission_balance', $payAmount);
                }
                if (!$directInviter->save()) {
                    return 'retry';
                }
                CommissionLog::create([
                    'invite_user_id' => $order->invite_user_id,
                    'user_id' => $order->user_id,
                    'trade_no' => $order->trade_no,
                    'order_amount' => $this->orderAmount($order),
                    'get_amount' => $payAmount,
                    'credited_at' => time(),
                ]);
                $order->actual_commission_balance = (int) $order->actual_commission_balance + $payAmount;
                $remainingBudget = 0;
            }
        }

        return $remainingBudget > 0 ? 'invalid' : 'ok';
    }
}
