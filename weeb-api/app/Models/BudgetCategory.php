<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetCategory extends Model
{
    protected $fillable = ['budget_id', 'category_id', 'allocated_amount', 'spent_amount_cache', 'allocation_percent'];

    protected function casts(): array
    {
        return [
            'allocated_amount' => 'decimal:2',
            'spent_amount_cache' => 'decimal:2',
            'allocation_percent' => 'integer',
        ];
    }

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }
}
