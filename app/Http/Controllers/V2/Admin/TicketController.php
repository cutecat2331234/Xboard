<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Services\TicketService;
use App\Utils\Helper;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use App\Traits\SafeQueryColumns;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    use SafeQueryColumns;

    private const QUERY_COLUMNS = [
        'id', 'user_id', 'subject', 'level', 'ticket_type_id', 'status', 'reply_status',
        'created_at', 'updated_at',
    ];

    private function applyFiltersAndSorts(Request $request, $builder)
    {
        if ($request->has('filter')) {
            collect($request->input('filter'))->each(function ($filter) use ($builder) {
                $key = $this->resolveFilterField((string) ($filter['id'] ?? ''), self::QUERY_COLUMNS);
                if (!$key) {
                    return;
                }
                if (!array_key_exists('value', $filter)) {
                    return;
                }
                $value = $filter['value'];
                $builder->where(function ($query) use ($key, $value) {
                    if (is_array($value)) {
                        $query->whereIn($key, $value);
                    } else {
                        $query->where($key, 'like', "%{$value}%");
                    }
                });
            });
        }

        if ($request->has('sort')) {
            collect($request->input('sort'))->each(function ($sort) use ($builder) {
                $key = $this->resolveSortField((string) ($sort['id'] ?? ''), self::QUERY_COLUMNS);
                if (!$key) {
                    return;
                }
                $value = !empty($sort['desc']) ? 'DESC' : 'ASC';
                $builder->orderBy($key, $value);
            });
        }
    }
    public function fetch(Request $request)
    {
        if ($request->input('id')) {
            return $this->fetchTicketById($request);
        } else {
            return $this->fetchTickets($request);
        }
    }

    /**
     * Summary of fetchTicketById
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    private function fetchTicketById(Request $request)
    {
        $ticket = Ticket::with('messages', 'user', 'ticketType')->find($request->input('id'));

        if (!$ticket) {
            return $this->fail([400202, __('Ticket does not exist')]);
        }
        $ticket->messages->each(fn($msg) => $msg->setRelation('ticket', $ticket));
        $result = $ticket->toArray();
        $result['user'] = UserController::transformUserData($ticket->user);

        return $this->success($result);
    }

    /**
     * Summary of fetchTickets
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Contracts\Routing\ResponseFactory|\Illuminate\Http\Response
     */
    private function fetchTickets(Request $request)
    {
        $ticketModel = Ticket::with('user', 'ticketType')
            ->when($request->has('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->when($request->has('reply_status'), function ($query) use ($request) {
                // Accept either an array or a scalar; coerce to a clean list of ints so a stray
                // scalar can never blow up whereIn(). Empty/invalid input is ignored.
                $replyStatus = $request->input('reply_status');
                $replyStatus = array_values(array_filter(
                    array_map(
                        fn($v) => is_numeric($v) ? (int) $v : null,
                        is_array($replyStatus) ? $replyStatus : [$replyStatus]
                    ),
                    fn($v) => $v !== null
                ));
                if (!empty($replyStatus)) {
                    $query->whereIn('reply_status', $replyStatus);
                }
            })
            ->when($request->filled('ticket_type_id'), function ($query) use ($request) {
                $query->where('ticket_type_id', (int) $request->input('ticket_type_id'));
            })
            ->when($request->has('email'), function ($query) use ($request) {
                $query->whereHas('user', function ($q) use ($request) {
                    $q->where('email', $request->input('email'));
                });
            });

        $this->applyFiltersAndSorts($request, $ticketModel);
        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current', 1),
            $request->input('pageSize', 10)
        );
        $tickets = $ticketModel
            ->latest('updated_at')
            ->paginate(
                perPage: $pageSize,
                page: $current
            );

        $tickets->getCollection()->transform(function ($ticket) {
            $ticketData = $ticket->toArray();
            $ticketData['user'] = UserController::transformUserData($ticket->user);
            return $ticketData;
        });

        return $this->paginate($tickets);
    }

    public function reply(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric',
            'message' => 'required|string|max:5000'
        ], [
            'id.required' => __('Ticket ID cannot be empty'),
            'message.required' => __('Message cannot be empty'),
            'message.max' => __('Message is too long'),
        ]);
        $ticketService = new TicketService();
        $ticketService->replyByAdmin(
            $request->input('id'),
            $request->input('message'),
            $request->user()->id
        );
        return $this->success(true);
    }

    public function close(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric',
            'withdraw_rejected' => 'nullable|boolean',
            'withdraw_paid' => 'nullable|boolean',
        ], [
            'id.required' => __('Ticket ID cannot be empty'),
        ]);
        try {
            DB::transaction(function () use ($request) {
                $ticket = Ticket::where('id', $request->input('id'))->lockForUpdate()->firstOrFail();
                if ((int) $ticket->status !== Ticket::STATUS_OPENING) {
                    throw new \RuntimeException(__('Ticket is already closed'));
                }
                if (TicketService::isWithdrawTicket($ticket)) {
                    if ($request->boolean('withdraw_paid')) {
                        if (!TicketService::finalizeWithdrawPayout($ticket)) {
                            throw new \RuntimeException(__('Failed to finalize withdraw payout'));
                        }
                    } elseif ($request->boolean('withdraw_rejected')) {
                        if (!TicketService::restoreWithdrawCommission($ticket)) {
                            throw new \RuntimeException(__('Failed to restore withdraw commission'));
                        }
                    } else {
                        throw new \RuntimeException(__('Withdraw ticket requires withdraw_paid or withdraw_rejected'));
                    }
                }
                $ticket->status = Ticket::STATUS_CLOSED;
                $ticket->save();
            });
            return $this->success(true);
        } catch (ModelNotFoundException $e) {
            return $this->fail([400202, __('Ticket does not exist')]);
        } catch (\RuntimeException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\Exception $e) {
            return $this->fail([500101, __('Close failed')]);
        }
    }
}
