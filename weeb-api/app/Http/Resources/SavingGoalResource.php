<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavingGoalResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $target = max((float) $this->target_amount, 1);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'target_amount' => $this->target_amount,
            'current_amount' => $this->current_amount,
            'progress_percent' => round(((float) $this->current_amount / $target) * 100, 2),
            'target_date' => $this->target_date?->toDateString(),
            'priority' => $this->priority,
            'status' => $this->status,
        ];
    }
}
