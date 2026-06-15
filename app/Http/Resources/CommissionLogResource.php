<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommissionLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'order_amount' => $this->resource->order_amount,
            'trade_no' => $this->resource->trade_no,
            'get_amount' => $this->resource->get_amount,
            'created_at' => $this->resource->created_at,
        ];
    }
}
