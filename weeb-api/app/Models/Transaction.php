<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

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

    /**
     * What a report is allowed to count: money moving in or out of the accounts the report
     * covers — every account except the shared couple-savings pot.
     *
     * - Transactions sitting on a couple-savings account are the shared pot's own bookkeeping,
     *   so they stay out of a personal report entirely.
     * - An allocation between two own accounts is one move written as two rows; counting them
     *   would invent income and expense out of a transfer, so both rows drop out.
     * - An allocation that crosses into (or out of) the couple pot stays: that money really did
     *   leave the accounts this report adds up, so it counts as an expense — and comes back as
     *   income when it returns.
     */
    public function scopeCountedInReports(Builder $query): Builder
    {
        $coupleAccounts = FinancialAccount::query()->select('id')->where('purpose', 'couple_savings');
        // The metadata id is text once extracted, so the compared ids have to be text as well.
        $coupleAccountsAsText = FinancialAccount::query()->selectRaw('cast(id as text)')->where('purpose', 'couple_savings');

        // Older allocation rows carry the actor's email in `source` instead of 'account_allocation',
        // so the transfer is recognised by its counterpart in metadata, which every leg has.
        $counterpart = $this->counterpartAccountExpression($query);

        // Qualified: the pie chart runs this scope on a query joined with transaction_categories.
        $accountColumn = $query->qualifyColumn('account_id');
        $sourceColumn = $query->qualifyColumn('source');

        return $query
            ->where(fn ($accounts) => $accounts->whereNull($accountColumn)->orWhereNotIn($accountColumn, $coupleAccounts))
            ->where(fn ($transfers) => $transfers
                // An ordinary transaction: not marked as an allocation and pointing at no counterpart.
                ->where(fn ($plain) => $plain
                    ->where(fn ($marker) => $marker->whereNull($sourceColumn)->orWhere($sourceColumn, '!=', 'account_allocation'))
                    ->whereNull($counterpart))
                // A transfer that crosses the couple pot's edge still moves money in or out of the report.
                ->orWhereIn($counterpart, $coupleAccountsAsText));
    }

    private function counterpartAccountExpression(Builder $query): \Illuminate\Database\Query\Expression
    {
        $metadata = '"'.$this->getTable().'"."metadata"';

        $path = $query->getConnection()->getDriverName() === 'pgsql'
            ? "$metadata->>'counterpart_account_id'"
            : "json_extract($metadata, '$.counterpart_account_id')";

        // Cast so the JSON value compares against account ids on both pgsql (text) and sqlite (int).
        return DB::raw("cast($path as text)");
    }

    public function user()
    {
        return $this->belongsTo(User::class);
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
