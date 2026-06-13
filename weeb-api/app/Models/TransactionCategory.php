<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransactionCategory extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'account_id',
        'name',
        'slug',
        'transaction_type',
        'need_type',
        'icon',
        'color',
        'is_default',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function account()
    {
        return $this->belongsTo(FinancialAccount::class, 'account_id');
    }
}
