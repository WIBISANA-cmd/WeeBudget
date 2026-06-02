<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'month' => $this->month?->toDateString(),
            'planned_income' => $this->planned_income,
            'planned_expense' => $this->planned_expense,
            'daily_safe_amount' => $this->daily_safe_amount,
            'status' => $this->status,
            'categories' => $this->whenLoaded('categories', fn () => $this->categories->map(fn ($item) => [
                'id' => $item->id,
                'category_id' => $item->category_id,
                'category' => $item->relationLoaded('category') ? new CategoryResource($item->category) : null,
                'allocated_amount' => $item->allocated_amount,
                'spent_amount_cache' => $item->spent_amount_cache,
                'allocation_percent' => $item->allocation_percent,
                'remaining_amount' => (float) $item->allocated_amount - (float) $item->spent_amount_cache,
            ])),
        ];
    }
}
