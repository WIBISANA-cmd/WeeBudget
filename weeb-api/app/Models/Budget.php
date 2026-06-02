<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    protected $fillable = ['user_id', 'month', 'planned_income', 'planned_expense', 'daily_safe_amount', 'status'];

    protected function casts(): array
    {
        return [
            'month' => 'date',
            'planned_income' => 'decimal:2',
            'planned_expense' => 'decimal:2',
            'daily_safe_amount' => 'decimal:2',
        ];
    }

    public function categories()
    {
        return $this->hasMany(BudgetCategory::class);
    }
}
