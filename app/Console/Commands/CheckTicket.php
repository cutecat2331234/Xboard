<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use App\Services\TicketService;
use App\Support\AppFeature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckTicket extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:ticket';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '工单检查任务';

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
        if (!AppFeature::ticketEnabled()) {
            return 0;
        }

        Ticket::where('status', 0)
            ->where('updated_at', '<=', time() - 24 * 3600)
            ->where('reply_status', Ticket::REPLY_STATUS_REPLIED)
            ->lazyById(200)
            ->each(function ($ticket) {
                if (TicketService::isWithdrawTicket($ticket)) {
                    return;
                }
                if ($ticket->user_id === $ticket->last_reply_user_id) return;
                $ticket->status = Ticket::STATUS_CLOSED;
                if (!$ticket->save()) {
                    Log::warning('check:ticket failed to auto-close ticket', ['ticket_id' => $ticket->id]);
                }
            });

        $staleDays = max(1, (int) admin_setting('withdraw_ticket_stale_days', 14));
        Ticket::where('status', 0)
            ->where('updated_at', '<=', time() - $staleDays * 86400)
            ->lazyById(200)
            ->each(function ($ticket) {
                if (!TicketService::isWithdrawTicket($ticket)) {
                    return;
                }
                try {
                    DB::transaction(function () use ($ticket) {
                        $locked = Ticket::where('id', $ticket->id)->lockForUpdate()->first();
                        if (!$locked || (int) $locked->status !== Ticket::STATUS_OPENING) {
                            return;
                        }
                        if (!TicketService::restoreWithdrawCommission($locked)) {
                            Log::warning('check:ticket failed to restore withdraw commission', [
                                'ticket_id' => $locked->id,
                            ]);
                            return;
                        }
                        $locked->status = Ticket::STATUS_CLOSED;
                        if (!$locked->save()) {
                            throw new \RuntimeException('Failed to close stale withdraw ticket');
                        }
                    });
                } catch (\Throwable $e) {
                    Log::error('check:ticket stale withdraw handling failed', [
                        'ticket_id' => $ticket->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });
    }
}
