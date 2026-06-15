<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'plan_id' => $this->plan_id,
            'payment_id' => $this->payment_id,
            'period' => PlanService::getLegacyPeriod((string) $this->period),
            'trade_no' => $this->trade_no,
            'total_amount' => $this->total_amount,
            'handling_amount' => $this->handling_amount,
            'balance_amount' => $this->balance_amount,
            'surplus_credit' => $this->surplus_credit,
            'surplus_amount' => $this->surplus_amount,
            'type' => $this->type,
            'status' => $this->status,
            'discount_amount' => $this->discount_amount,
            'paid_at' => $this->paid_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'try_out_plan_id' => $this->when(isset($this->try_out_plan_id), $this->try_out_plan_id),
            'surplus_orders' => $this->when(isset($this->surplus_orders), $this->surplus_orders),
            'plan' => $this->whenLoaded('plan', fn () => PlanResource::make($this->plan)),
            'payment' => $this->whenLoaded('payment', fn () => $this->payment ? [
                'id' => $this->payment->id,
                'name' => $this->payment->name,
                'payment' => $this->payment->payment,
                'icon' => $this->payment->icon,
            ] : null),
        ];
    }
}
