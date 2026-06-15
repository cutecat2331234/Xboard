<?php

namespace App\Http\Resources;

use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CouponResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type,
            'value' => $this->value,
            'limit_plan_ids' => empty($this->limit_plan_ids) ? null : collect($this->limit_plan_ids)
                ->map(fn (mixed $id): string => (string) $id)
                ->values()
                ->all(),
            'limit_period' => empty($this->limit_period) ? null : collect($this->limit_period)
                ->map(fn (mixed $period): string => (string) PlanService::convertToLegacyPeriod($period))
                ->values()
                ->all(),
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
        ];
    }
}
