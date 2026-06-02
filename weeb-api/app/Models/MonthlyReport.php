<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlyReport extends Model
{
    protected $fillable = ['user_id', 'month', 'total_income', 'total_expense', 'total_saving', 'remaining_amount', 'financial_health_score', 'summary', 'generated_at'];

    protected function casts(): array
    {
        return [
            'month' => 'date',
            'total_income' => 'decimal:2',
            'total_expense' => 'decimal:2',
            'total_saving' => 'decimal:2',
            'remaining_amount' => 'decimal:2',
            'financial_health_score' => 'integer',
            'summary' => 'array',
            'generated_at' => 'datetime',
        ];
    }
}
