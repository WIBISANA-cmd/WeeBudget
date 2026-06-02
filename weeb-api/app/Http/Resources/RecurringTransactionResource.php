<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringTransactionResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'transaction_type' => $this->transaction_type,
            'amount' => $this->amount,
            'frequency' => $this->frequency,
            'day_of_month' => $this->day_of_month,
            'next_run_date' => $this->next_run_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
