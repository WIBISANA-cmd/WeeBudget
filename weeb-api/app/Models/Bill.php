<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bill extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'category_id', 'name', 'amount_estimate', 'due_day', 'next_due_date', 'frequency', 'reminder_days', 'status'];

    protected function casts(): array
    {
        return [
            'amount_estimate' => 'decimal:2',
            'due_day' => 'integer',
            'next_due_date' => 'date',
            'reminder_days' => 'array',
        ];
    }
}
