<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\TicketSave;
use App\Http\Requests\User\TicketWithdraw;
use App\Http\Resources\TicketResource;
use App\Models\CommissionLog;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TicketType;
use App\Models\User;
use App\Services\TicketService;
use App\Support\AppFeature;
use App\Utils\Dict;
use Illuminate\Http\Request;
use App\Services\Plugin\HookManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class TicketController extends Controller
{
    public function fetch(Request $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('The ticket system is disabled')]);
        }
        if ($request->input('id')) {
            $ticket = Ticket::where('id', $request->input('id'))
                ->where('user_id', $request->user()->id)
                ->first();
            if (!$ticket) {
                return $this->fail([400, __('Ticket does not exist')]);
            }
            $ticket->load('message');
            $ticket['message'] = TicketMessage::where('ticket_id', $ticket->id)
                ->orderBy('id')
                ->limit(500)
                ->get();
            $ticket['message']->each(function ($message) use ($ticket) {
                $message['is_me'] = ($message['user_id'] == $ticket->user_id);
            });
            return $this->success(TicketResource::make($ticket)->additional(['message' => true]));
        }

        $request->validate([
            'current' => 'nullable|integer|min:1',
            'page_size' => 'nullable|integer|min:1|max:100',
        ], [
            'current.min' => __('Invalid pagination parameters'),
            'page_size.min' => __('Invalid pagination parameters'),
            'page_size.max' => __('Page size cannot exceed 100'),
        ]);
        $current = max(1, (int) $request->input('current', 1));
        $pageSize = min(100, max(1, (int) $request->input('page_size', 20)));

        $builder = Ticket::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'DESC');
        $total = (clone $builder)->count();
        $tickets = $builder->forPage($current, $pageSize)->get();

        return $this->success([
            'data' => TicketResource::collection($tickets),
            'total' => $total,
            'current_page' => $current,
            'page_size' => $pageSize,
        ]);
    }

    public function save(TicketSave $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('The ticket system is disabled')]);
        }
        $ticketService = new TicketService();
        $ticket = $ticketService->createTicket(
            $request->user()->id,
            $request->input('subject'),
            $request->input('level'),
            $request->input('message'),
            $request->input('ticket_type_id')
        );
        HookManager::call('ticket.create.after', $ticket);
        return $this->success(['id' => $ticket->id]);

    }

    public function types(Request $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('The ticket system is disabled')]);
        }
        $types = TicketType::where('show', 1)
            ->orderBy('sort', 'ASC')
            ->orderBy('id', 'ASC')
            ->get(['id', 'name']);
        return $this->success($types);
    }

    public function reply(Request $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('The ticket system is disabled')]);
        }

        // 防止刷工单回复(DB 写放大 + 通知队列压力)。镜像 invite/coupon 的限流写法。
        $rateKey = 'ticket-reply:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($rateKey, 30)) {
            return $this->fail([429, __('Too many attempts')]);
        }
        RateLimiter::hit($rateKey, 60);

        if (empty($request->input('id'))) {
            return $this->fail([400, __('Invalid parameter')]);
        }
        if (empty($request->input('message'))) {
            return $this->fail([400, __('Message cannot be empty')]);
        }
        $request->validate([
            'message' => 'required|string|max:5000',
        ], [
            'message.required' => __('Message cannot be empty'),
            'message.max' => __('Message is too long'),
        ]);
        $ticket = Ticket::where('id', $request->input('id'))
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$ticket) {
            return $this->fail([400, __('Ticket does not exist')]);
        }
        if ((int) $ticket->status !== Ticket::STATUS_OPENING) {
            return $this->fail([400, __('The ticket is closed and cannot be replied')]);
        }
        if ((int) admin_setting('ticket_must_wait_reply', 0)) {
            $lastMessage = $this->getLastMessage($ticket->id);
            if ($lastMessage && $request->user()->id == $lastMessage->user_id) {
                return $this->fail(codeResponse: [400, __('Please wait for the technical engineer to reply')]);
            }
        }
        $ticketService = new TicketService();
        if (
            !$ticketService->reply(
                $ticket,
                $request->input('message'),
                $request->user()->id
            )
        ) {
            return $this->fail([400, __('Ticket reply failed')]);
        }
        HookManager::call('ticket.reply.user.after', $ticket);
        return $this->success(true);
    }


    public function close(Request $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('The ticket system is disabled')]);
        }
        if (empty($request->input('id'))) {
            return $this->fail([422, __('Invalid parameter')]);
        }
        $ticket = Ticket::where('id', $request->input('id'))
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$ticket) {
            return $this->fail([400, __('Ticket does not exist')]);
        }
        if ((int) $ticket->status !== Ticket::STATUS_OPENING) {
            return $this->fail([400, __('The ticket is closed')]);
        }
        try {
            DB::transaction(function () use ($ticket) {
                $locked = Ticket::where('id', $ticket->id)->lockForUpdate()->first();
                if (!$locked || (int) $locked->status !== Ticket::STATUS_OPENING) {
                    throw new \RuntimeException(__('The ticket is closed'));
                }
                $firstMessage = TicketMessage::where('ticket_id', $locked->id)
                    ->orderBy('id')
                    ->value('message');
                if (TicketService::isWithdrawTicket($locked, is_string($firstMessage) ? $firstMessage : null)) {
                    throw new \RuntimeException(__('Withdraw tickets cannot be closed by user'));
                }
                $locked->status = Ticket::STATUS_CLOSED;
                if (!$locked->save()) {
                    throw new \RuntimeException(__('Close failed'));
                }
            });
        } catch (\RuntimeException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\Exception $e) {
            return $this->fail([500, __('Close failed')]);
        }
        return $this->success(true);
    }

    private function getLastMessage($ticketId)
    {
        return TicketMessage::where('ticket_id', $ticketId)
            ->orderBy('id', 'DESC')
            ->first();
    }

    public function withdraw(TicketWithdraw $request)
    {
        if (!AppFeature::commissionEnabled() || !AppFeature::ticketEnabled()) {
            return $this->fail([403, __('Unsupported withdraw')]);
        }
        if ((int) admin_setting('withdraw_close_enable', 0)) {
            return $this->fail([400, __('Unsupported withdraw')]);
        }
        if (
            !in_array(
                $request->input('withdraw_method'),
                admin_setting('commission_withdraw_method', Dict::WITHDRAW_METHOD_WHITELIST_DEFAULT)
            )
        ) {
            return $this->fail([422, __('Unsupported withdrawal method')]);
        }

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($request) {
                $user = User::where('id', $request->user()->id)->lockForUpdate()->first();
                $limit = admin_setting('commission_withdraw_limit', 100);
                $withdrawAmount = (int) $user->commission_balance;

                if ($withdrawAmount <= 0) {
                    return $this->fail([422, __('Insufficient commission balance')]);
                }

                $feeRate = max(0, min(1, (float) admin_setting('app_withdraw_fee_rate', 0)));
                $feeAmount = $feeRate > 0 ? (int) round($withdrawAmount * $feeRate) : 0;
                $netAmount = $withdrawAmount - $feeAmount;

                if ($limit > 0 && $limit > ($withdrawAmount / 100)) {
                    return $this->fail([422, __('The current required minimum withdrawal commission is :limit', ['limit' => $limit])]);
                }

                if ($netAmount <= 0) {
                    return $this->fail([422, __('Insufficient commission balance')]);
                }

                $hasOpenWithdraw = Ticket::where('user_id', $user->id)
                    ->where('status', 0)
                    ->where('level', 2)
                    ->exists();
                if ($hasOpenWithdraw) {
                    return $this->fail([422, __('You already have a pending withdrawal request')]);
                }

                $ticketService = new TicketService();
                $subject = TicketService::withdrawSubject();
                $message = TicketService::buildWithdrawMessage(
                    $withdrawAmount,
                    $netAmount,
                    $request->input('withdraw_method'),
                    $request->input('withdraw_account')
                );
                if ($feeAmount > 0) {
                    $message .= "\r\n" . __('Withdrawal fee') . '：' . number_format($feeAmount / 100, 2);
                    $message .= "\r\n" . __('Net payout') . '：' . number_format($netAmount / 100, 2);
                }
                $ticket = $ticketService->createWithdrawTicket(
                    $request->user()->id,
                    $subject,
                    $message
                );

                $user->commission_balance = 0;
                if (!$user->save()) {
                    throw new \RuntimeException(__('Failed to update commission balance'));
                }

                CommissionLog::create([
                    'invite_user_id' => $user->id,
                    'user_id' => $user->id,
                    'trade_no' => 'withdraw:' . $ticket->id,
                    'order_amount' => $withdrawAmount,
                    'get_amount' => 0,
                    'credited_at' => null,
                ]);

                HookManager::call('ticket.create.after', $ticket);

                return $this->success(true);
            });
        } catch (ApiException $e) {
            return $this->fail([422, $e->getMessage()]);
        } catch (\Exception $e) {
            Log::error('Withdraw ticket failed', ['error' => $e->getMessage()]);
            return $this->fail([500, __('Request failed, please try again later')]);
        }
    }
}
