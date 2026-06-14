<?php
namespace App\Services;


use App\Exceptions\ApiException;
use App\Jobs\SendEmailJob;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\Plugin\HookManager;

class TicketService
{
    public const WITHDRAW_AMOUNT_PATTERN = '/^\[withdraw_amount:(\d+)\]/';

    public const WITHDRAW_SUBJECT_PREFIX = '[withdraw_ticket]';

    public static function withdrawSubject(): string
    {
        return self::WITHDRAW_SUBJECT_PREFIX . ' ' . __('Commission withdrawal request');
    }

    public static function buildWithdrawMessage(int $amountCents, string $method, string $account): string
    {
        return sprintf(
            "[withdraw_amount:%d]\r\n%s\r\n%s\r\n%s",
            $amountCents,
            __('Withdrawal amount') . '：' . number_format($amountCents / 100, 2),
            __('Withdrawal method') . '：' . $method,
            __('Withdrawal account') . '：' . $account
        );
    }

    public static function parseWithdrawAmountCents(?string $message): ?int
    {
        if ($message === null || $message === '') {
            return null;
        }
        if (preg_match('/\[withdraw_amount:(\d+)\]/', $message, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    public static function isLegacyWithdrawTicket(Ticket $ticket): bool
    {
        if ((int) $ticket->level !== 2) {
            return false;
        }
        if (str_starts_with((string) $ticket->subject, self::WITHDRAW_SUBJECT_PREFIX)) {
            return false;
        }
        $subject = (string) $ticket->subject;

        return str_contains($subject, 'Commission Withdrawal Request')
            || str_contains($subject, 'Commission withdrawal')
            || str_contains($subject, '佣金提现');
    }

    public static function isWithdrawTicket(Ticket $ticket, ?string $firstMessage = null): bool
    {
        return self::isOfficialWithdrawTicket($ticket, $firstMessage)
            || self::isLegacyWithdrawTicket($ticket);
    }

    public static function isOfficialWithdrawTicket(Ticket $ticket, ?string $firstMessage = null): bool
    {
        if ((int) $ticket->level !== 2) {
            return false;
        }

        if (!str_starts_with((string) $ticket->subject, self::WITHDRAW_SUBJECT_PREFIX)) {
            $subject = (string) $ticket->subject;
            $isLegacyOfficial = str_contains($subject, 'Commission Withdrawal Request')
                || str_contains($subject, 'Commission withdrawal')
                || str_contains($subject, '佣金提现');
            if (!$isLegacyOfficial) {
                return false;
            }
        }

        if ($firstMessage === null) {
            $firstMessage = TicketMessage::where('ticket_id', $ticket->id)
                ->orderBy('id')
                ->value('message');
        }

        return is_string($firstMessage) && preg_match(self::WITHDRAW_AMOUNT_PATTERN, trim($firstMessage)) === 1;
    }

    /**
     * Restore withheld commission when a withdrawal ticket is rejected/closed without payout.
     */
    public static function restoreWithdrawCommission(Ticket $ticket): bool
    {
        return (bool) DB::transaction(function () use ($ticket) {
            $ticket = Ticket::where('id', $ticket->id)->lockForUpdate()->first();
            if (!$ticket || (int) $ticket->status !== Ticket::STATUS_OPENING) {
                return false;
            }

            $alreadyRestored = TicketMessage::where('ticket_id', $ticket->id)
                ->where('message', '[withdraw_restored]')
                ->lockForUpdate()
                ->exists();
            if ($alreadyRestored) {
                return false;
            }

            $firstMessage = TicketMessage::where('ticket_id', $ticket->id)
                ->orderBy('id')
                ->value('message');

            if (!self::isWithdrawTicket($ticket, $firstMessage)) {
                return false;
            }

            $amountCents = self::parseWithdrawAmountCents($firstMessage);
            if ($amountCents === null || $amountCents <= 0) {
                return false;
            }

            $user = User::where('id', $ticket->user_id)->lockForUpdate()->first();
            if (!$user) {
                return false;
            }

            $user->commission_balance = (int) $user->commission_balance + $amountCents;
            if (!$user->save()) {
                return false;
            }

            TicketMessage::create([
                'user_id' => $ticket->user_id,
                'ticket_id' => $ticket->id,
                'message' => '[withdraw_restored]',
            ]);

            return true;
        });
    }

    public function reply($ticket, $message, $userId)
    {
        try {
            DB::beginTransaction();
            $ticket = Ticket::where('id', $ticket->id)->lockForUpdate()->first();
            if (!$ticket || (int) $ticket->status !== Ticket::STATUS_OPENING) {
                DB::rollBack();
                return false;
            }
            $ticketMessage = TicketMessage::create([
                'user_id' => $userId,
                'ticket_id' => $ticket->id,
                'message' => $message
            ]);
            $isAdmin = $userId !== $ticket->user_id;
            $ticket->reply_status = $isAdmin
                ? Ticket::REPLY_STATUS_REPLIED
                : Ticket::REPLY_STATUS_WAITING;
            $ticket->last_reply_user_id = $userId;
            if (!$ticketMessage || !$ticket->save()) {
                throw new \Exception();
            }
            DB::commit();
            return $ticketMessage;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Ticket reply failed: ' . $e->getMessage());
            return false;
        }
    }

    public function replyByAdmin($ticketId, $message, $userId): void
    {
        $ticket = Ticket::where('id', $ticketId)->first();
        if (!$ticket) {
            throw new ApiException('工单不存在');
        }
        if ((int) $ticket->status !== Ticket::STATUS_OPENING) {
            throw new ApiException('工单已关闭');
        }
        $ticketMessage = $this->reply($ticket, $message, $userId);
        if (!$ticketMessage) {
            throw new ApiException('工单回复失败');
        }
        HookManager::call('ticket.reply.admin.after', [$ticket, $ticketMessage]);
        $this->sendEmailNotify($ticket, $ticketMessage);
    }

    public function createTicket($userId, $subject, $level, $message)
    {
        if ((int) $level === 2) {
            throw new ApiException('请使用提现接口发起提现工单');
        }

        try {
            DB::beginTransaction();
            User::where('id', $userId)->lockForUpdate()->first();

            $openTicketQuery = Ticket::where('status', 0)->where('user_id', $userId);
            $openTicketQuery->where('level', '!=', 2);

            if ($openTicketQuery->lockForUpdate()->first()) {
                DB::rollBack();
                throw new ApiException('存在未关闭的工单');
            }
            $ticket = Ticket::create([
                'user_id' => $userId,
                'subject' => $subject,
                'level' => $level,
                'reply_status' => Ticket::REPLY_STATUS_WAITING,
                'last_reply_user_id' => $userId,
            ]);
            if (!$ticket) {
                throw new ApiException('工单创建失败');
            }
            $ticketMessage = TicketMessage::create([
                'user_id' => $userId,
                'ticket_id' => $ticket->id,
                'message' => $message
            ]);
            if (!$ticketMessage) {
                DB::rollBack();
                throw new ApiException('工单消息创建失败');
            }
            DB::commit();
            return $ticket;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Create an official commission-withdraw ticket (level 2).
     */
    public function createWithdrawTicket(int $userId, string $subject, string $message): Ticket
    {
        try {
            DB::beginTransaction();
            User::where('id', $userId)->lockForUpdate()->first();

            if (
                Ticket::where('status', 0)
                    ->where('user_id', $userId)
                    ->where('level', 2)
                    ->lockForUpdate()
                    ->exists()
            ) {
                DB::rollBack();
                throw new ApiException('存在未关闭的工单');
            }

            $ticket = Ticket::create([
                'user_id' => $userId,
                'subject' => $subject,
                'level' => 2,
                'reply_status' => Ticket::REPLY_STATUS_WAITING,
                'last_reply_user_id' => $userId,
            ]);
            if (!$ticket) {
                throw new ApiException('工单创建失败');
            }
            $ticketMessage = TicketMessage::create([
                'user_id' => $userId,
                'ticket_id' => $ticket->id,
                'message' => $message
            ]);
            if (!$ticketMessage) {
                DB::rollBack();
                throw new ApiException('工单消息创建失败');
            }
            DB::commit();
            return $ticket;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // 半小时内不再重复通知
    private function sendEmailNotify(Ticket $ticket, TicketMessage $ticketMessage)
    {
        $user = User::find($ticket->user_id);
        if (!$user) {
            return;
        }
        $cacheKey = 'ticket_sendEmailNotify_' . $ticket->user_id;
        if (!Cache::get($cacheKey)) {
            Cache::put($cacheKey, 1, 1800);
            SendEmailJob::dispatch([
                'email' => $user->email,
                'subject' => '您在' . admin_setting('app_name', 'XBoard') . '的工单得到了回复',
                'template_name' => 'notify',
                'template_value' => [
                    'name' => admin_setting('app_name', 'XBoard'),
                    'url' => admin_setting('app_url'),
                    'content' => "主题：{$ticket->subject}\r\n回复内容：{$ticketMessage->message}"
                ]
            ]);
        }
    }
}
