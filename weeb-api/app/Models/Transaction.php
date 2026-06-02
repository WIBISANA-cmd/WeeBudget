<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'account_id',
        'category_id',
        'recurring_transaction_id',
        'bill_id',
        'saving_goal_id',
        'wishlist_id',
        'transaction_type',
        'amount',
        'need_type',
        'transaction_date',
        'occurred_at',
        'description',
        'notes',
        'source',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_date' => 'date',
            'occurred_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function account()
    {
        return $this->belongsTo(FinancialAccount::class, 'account_id');
    }
}
