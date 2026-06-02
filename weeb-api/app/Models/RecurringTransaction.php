<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringTransaction extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'account_id', 'category_id', 'name', 'transaction_type', 'amount', 'frequency', 'day_of_month', 'next_run_date', 'status', 'notes'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'day_of_month' => 'integer',
            'next_run_date' => 'date',
        ];
    }
}
