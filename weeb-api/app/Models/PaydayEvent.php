<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaydayEvent extends Model
{
    protected $fillable = ['user_id', 'expected_date', 'paid_date', 'expected_amount', 'received_amount', 'status'];

    protected function casts(): array
    {
        return [
            'expected_date' => 'date',
            'paid_date' => 'date',
            'expected_amount' => 'decimal:2',
            'received_amount' => 'decimal:2',
        ];
    }
}
