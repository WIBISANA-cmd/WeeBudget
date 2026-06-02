<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BillResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'amount_estimate' => $this->amount_estimate,
            'due_day' => $this->due_day,
            'next_due_date' => $this->next_due_date?->toDateString(),
            'frequency' => $this->frequency,
            'reminder_days' => $this->reminder_days,
            'status' => $this->status,
        ];
    }
}
