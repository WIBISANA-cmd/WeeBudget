<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'account' => $this->whenLoaded('account', fn () => new FinancialAccountResource($this->account)),
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => new CategoryResource($this->category)),
            'transaction_type' => $this->transaction_type,
            'amount' => $this->amount,
            'need_type' => $this->need_type,
            'transaction_date' => $this->transaction_date?->toDateString(),
            'occurred_at' => $this->occurred_at?->toISOString(),
            'description' => $this->description,
            'notes' => $this->notes,
            'source' => $this->source,
            'links' => [
                'bill_id' => $this->bill_id,
                'saving_goal_id' => $this->saving_goal_id,
                'wishlist_id' => $this->wishlist_id,
                'recurring_transaction_id' => $this->recurring_transaction_id,
            ],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
