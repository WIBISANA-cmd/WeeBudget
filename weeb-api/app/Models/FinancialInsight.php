<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialInsight extends Model
{
    protected $fillable = ['user_id', 'month', 'type', 'severity', 'title', 'message', 'payload', 'status', 'read_at'];

    protected function casts(): array
    {
        return [
            'month' => 'date',
            'payload' => 'array',
            'read_at' => 'datetime',
        ];
    }
}
