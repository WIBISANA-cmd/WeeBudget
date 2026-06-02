<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Wishlist extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'name', 'estimated_amount', 'need_type', 'waiting_days', 'waiting_until', 'status', 'impact_snapshot', 'notes'];

    protected function casts(): array
    {
        return [
            'estimated_amount' => 'decimal:2',
            'waiting_days' => 'integer',
            'waiting_until' => 'date',
            'impact_snapshot' => 'array',
        ];
    }
}
