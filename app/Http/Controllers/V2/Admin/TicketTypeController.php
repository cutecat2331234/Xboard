<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TicketTypeSave;
use App\Models\Ticket;
use App\Models\TicketType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TicketTypeController extends Controller
{
    public function fetch(Request $request)
    {
        $ticketTypes = TicketType::orderBy('sort', 'ASC')
            ->orderBy('id', 'ASC')
            ->get();

        return $this->success($ticketTypes);
    }

    public function save(TicketTypeSave $request)
    {
        $data = $request->only(['name', 'sort', 'show']);

        try {
            return DB::transaction(function () use ($request, $data) {
                if ($request->input('id')) {
                    $ticketType = TicketType::where('id', $request->input('id'))->lockForUpdate()->first();
                    if (!$ticketType) {
                        return $this->fail([400202, __('Ticket type does not exist')]);
                    }
                    if (!$ticketType->update($data)) {
                        return $this->fail([500, __('Save failed')]);
                    }
                } else {
                    if (!TicketType::create($data)) {
                        return $this->fail([500, __('Save failed')]);
                    }
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function drop(Request $request)
    {
        if (empty($request->input('id'))) {
            return $this->fail([422, __('Ticket type ID cannot be empty')]);
        }

        try {
            return DB::transaction(function () use ($request) {
                $ticketType = TicketType::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$ticketType) {
                    return $this->fail([400202, __('Ticket type does not exist')]);
                }
                // 删除前把引用该类型的工单 ticket_type_id 置 null，避免悬挂引用。
                Ticket::where('ticket_type_id', $ticketType->id)->update(['ticket_type_id' => null]);
                if (!$ticketType->delete()) {
                    return $this->fail([500, __('Delete failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }
}
