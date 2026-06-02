<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SavingGoal extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'name', 'type', 'target_amount', 'current_amount', 'target_date', 'priority', 'status'];

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'current_amount' => 'decimal:2',
            'target_date' => 'date',
            'priority' => 'integer',
        ];
    }
}
