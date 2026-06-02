<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialPeriodResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'payday_date' => $this->payday_date?->toDateString(),
            'opening_balance' => $this->opening_balance,
            'income_target' => $this->income_target,
            'expense_limit' => $this->expense_limit,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
