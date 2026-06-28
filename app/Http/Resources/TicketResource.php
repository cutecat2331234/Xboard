<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {  
        $data = [
            "id" => $this['id'],
            "level" => $this['level'],
            "ticket_type_id" => $this['ticket_type_id'] ?? null,
            "ticket_type" => $this->whenLoaded('ticketType', fn() => $this->ticketType?->name),
            "reply_status" => $this['reply_status'],
            "status" => $this['status'],
            "subject" => $this['subject'],
            "message" => array_key_exists('message',$this->additional) ? MessageResource::collection($this['message']) : null,
            "created_at" => $this['created_at'],
            "updated_at" => $this['updated_at']
        ];
        return $data;

    }
}
