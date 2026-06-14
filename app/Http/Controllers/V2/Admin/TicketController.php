<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use App\Traits\SafeQueryColumns;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    use SafeQueryColumns;

    private const QUERY_COLUMNS = [
        'id', 'user_id', 'subject', 'level', 'status', 'reply_status',
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
                $value = $sort['desc'] ? 'DESC' : 'ASC';
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
        $ticket = Ticket::with('messages', 'user')->find($request->input('id'));

        if (!$ticket) {
            return $this->fail([400202, '工单不存在']);
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
        $ticketModel = Ticket::with('user')
            ->when($request->has('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->when($request->has('reply_status'), function ($query) use ($request) {
                $query->whereIn('reply_status', $request->input('reply_status'));
            })
            ->when($request->has('email'), function ($query) use ($request) {
                $query->whereHas('user', function ($q) use ($request) {
                    $q->where('email', $request->input('email'));
                });
            });

        $this->applyFiltersAndSorts($request, $ticketModel);
        $tickets = $ticketModel
            ->latest('updated_at')
            ->paginate(
                perPage: $request->integer('pageSize', 10),
                page: $request->integer('current', 1)
            );

        // 获取items然后映射转换
        $items = collect($tickets->items())->map(function ($ticket) {
            $ticketData = $ticket->toArray();
            $ticketData['user'] = UserController::transformUserData($ticket->user);
            return $ticketData;
        })->all();

        return response([
            'data' => $items,
            'total' => $tickets->total()
        ]);
    }

    public function reply(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric',
            'message' => 'required|string'
        ], [
            'id.required' => '工单ID不能为空',
            'message.required' => '消息不能为空'
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
            'id.required' => '工单ID不能为空'
        ]);
        try {
            DB::transaction(function () use ($request) {
                $ticket = Ticket::where('id', $request->input('id'))->lockForUpdate()->firstOrFail();
                if ((int) $ticket->status !== Ticket::STATUS_OPENING) {
                    throw new \RuntimeException('Already closed');
                }
                if (TicketService::isWithdrawTicket($ticket)) {
                    if ($request->boolean('withdraw_paid')) {
                        if (!TicketService::finalizeWithdrawPayout($ticket)) {
                            throw new \RuntimeException('Failed to finalize withdraw payout');
                        }
                    } elseif ($request->boolean('withdraw_rejected')) {
                        if (!TicketService::restoreWithdrawCommission($ticket)) {
                            throw new \RuntimeException('Failed to restore withdraw commission');
                        }
                    } else {
                        throw new \RuntimeException('Withdraw ticket requires withdraw_paid or withdraw_rejected');
                    }
                }
                $ticket->status = Ticket::STATUS_CLOSED;
                $ticket->save();
            });
            return $this->success(true);
        } catch (ModelNotFoundException $e) {
            return $this->fail([400202, '工单不存在']);
        } catch (\RuntimeException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\Exception $e) {
            return $this->fail([500101, '关闭失败']);
        }
    }

    public function show($ticketId)
    {
        $ticket = Ticket::with([
            'user',
            'messages' => function ($query) {
                $query->with(['user']);
            }
        ])->findOrFail($ticketId);

        $ticket->messages->each(fn($msg) => $msg->setRelation('ticket', $ticket));

        return response()->json([
            'data' => $ticket
        ]);
    }
}
