<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $isAccountAllocation = ! empty(data_get($this->metadata, 'actor_user_id'));

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
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
            'entry_type' => $isAccountAllocation ? 'account_allocation' : 'manual',
            'metadata' => $this->metadata ? [
                'direction' => data_get($this->metadata, 'direction'),
                'actor_label' => data_get($this->metadata, 'actor_label'),
                'actor_user_id' => data_get($this->metadata, 'actor_user_id'),
                'counterpart_account_id' => data_get($this->metadata, 'counterpart_account_id'),
                'counterpart_account_name' => data_get($this->metadata, 'counterpart_account_name'),
                'counterpart_transaction_id' => data_get($this->metadata, 'counterpart_transaction_id'),
            ] : null,
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
