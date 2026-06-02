<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WishlistResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'estimated_amount' => $this->estimated_amount,
            'need_type' => $this->need_type,
            'waiting_days' => $this->waiting_days,
            'waiting_until' => $this->waiting_until?->toDateString(),
            'status' => $this->status,
            'impact_snapshot' => $this->impact_snapshot,
            'notes' => $this->notes,
        ];
    }
}
