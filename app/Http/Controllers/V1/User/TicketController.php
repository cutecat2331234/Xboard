<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\TicketSave;
use App\Http\Requests\User\TicketWithdraw;
use App\Http\Resources\TicketResource;
use App\Models\CommissionLog;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\TicketService;
use App\Support\AppFeature;
use App\Utils\Dict;
use Illuminate\Http\Request;
use App\Services\Plugin\HookManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TicketController extends Controller
{
    public function fetch(Request $request)
    {
        if ($request->input('id')) {
            $ticket = Ticket::where('id', $request->input('id'))
                ->where('user_id', $request->user()->id)
                ->first();
            if (!$ticket) {
                return $this->fail([400, __('Ticket does not exist')]);
            }
            $ticket->load('message');
            $ticket['message'] = TicketMessage::where('ticket_id', $ticket->id)->get();
            $ticket['message']->each(function ($message) use ($ticket) {
                $message['is_me'] = ($message['user_id'] == $ticket->user_id);
            });
            return $this->success(TicketResource::make($ticket)->additional(['message' => true]));
        }
        $ticket = Ticket::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'DESC')
            ->get();
        return $this->success(TicketResource::collection($ticket));
    }

    public function save(TicketSave $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('Ticket reply failed')]);
        }
        $ticketService = new TicketService();
        $ticket = $ticketService->createTicket(
            $request->user()->id,
            $request->input('subject'),
            $request->input('level'),
            $request->input('message')
        );
        HookManager::call('ticket.create.after', $ticket);
        return $this->success(true);

    }

    public function reply(Request $request)
    {
        if (!AppFeature::ticketEnabled()) {
            return $this->fail([403, __('Ticket reply failed')]);
        }
        if (empty($request->input('id'))) {
            return $this->fail([400, __('Invalid parameter')]);
        }
        if (empty($request->input('message'))) {
            return $this->fail([400, __('Message cannot be empty')]);
        }
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
                return $this->fail(codeResponse: [400, __('Please wait for the technical enginneer to reply')]);
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
                    throw new \RuntimeException('Already closed');
                }
                $firstMessage = TicketMessage::where('ticket_id', $locked->id)
                    ->orderBy('id')
                    ->value('message');
                if (TicketService::isWithdrawTicket($locked, is_string($firstMessage) ? $firstMessage : null)) {
                    TicketService::restoreWithdrawCommission($locked);
                }
                $locked->status = Ticket::STATUS_CLOSED;
                if (!$locked->save()) {
                    throw new \RuntimeException('Close failed');
                }
            });
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
            return $this->fail([400, 'Unsupported withdraw']);
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
                    throw new \RuntimeException('Failed to update commission balance');
                }

                CommissionLog::create([
                    'invite_user_id' => $user->id,
                    'user_id' => $user->id,
                    'trade_no' => 'withdraw:' . $ticket->id,
                    'order_amount' => $withdrawAmount,
                    'get_amount' => 0,
                ]);

                HookManager::call('ticket.create.after', $ticket);

                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error('Withdraw ticket failed', ['error' => $e->getMessage()]);
            return $this->fail([500, __('Request failed, please try again later')]);
        }
    }
}
