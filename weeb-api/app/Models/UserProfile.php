<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'currency',
        'timezone',
        'payday_day',
        'payday_frequency',
        'monthly_income_estimate',
        'daily_safe_amount_target',
        'account_mode',
        'budget_planner_allocations',
        'onboarding_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'monthly_income_estimate' => 'decimal:2',
            'daily_safe_amount_target' => 'decimal:2',
            'budget_planner_allocations' => 'array',
            'onboarding_completed_at' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
