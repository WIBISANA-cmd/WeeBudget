<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialPeriod extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'start_date',
        'end_date',
        'payday_date',
        'opening_balance',
        'income_target',
        'expense_limit',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'payday_date' => 'date',
            'opening_balance' => 'decimal:2',
            'income_target' => 'decimal:2',
            'expense_limit' => 'decimal:2',
        ];
    }
}
