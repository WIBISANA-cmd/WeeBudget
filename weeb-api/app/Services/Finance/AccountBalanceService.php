<?php

namespace App\Services\Finance;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AccountBalanceService
{
    public function __construct(private readonly CoupleSavingsAccessService $coupleAccess)
    {
    }

    public function createTransaction(array $data, int $userId, ?string $forcedType = null): Transaction
    {
        return DB::transaction(function () use ($data, $userId, $forcedType) {
            $payload = [
                ...$data,
                'user_id' => $userId,
                'transaction_type' => $forcedType ?? $data['transaction_type'],
            ];
            $payload['account_id'] = $this->resolveAccountId($userId, $payload['account_id'] ?? null);

            $transaction = Transaction::query()->create($payload);
            $this->applyEffect($transaction);

            return $transaction;
        });
    }

    public function updateTransaction(Transaction $transaction, array $data, int $userId, ?string $forcedType = null): Transaction
    {
        return DB::transaction(function () use ($transaction, $data, $userId, $forcedType) {
            $model = Transaction::query()
                ->whereKey($transaction->id)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->reverseEffect($model);

            $payload = $data;
            if ($forcedType !== null) {
                $payload['transaction_type'] = $forcedType;
            }

            if (array_key_exists('account_id', $payload)) {
                $payload['account_id'] = $this->resolveAccountId($userId, $payload['account_id']);
            } elseif ($model->account_id === null) {
                $payload['account_id'] = $this->resolveAccountId($userId);
            }

            $model->update($payload);
            $model = $model->fresh();
            $this->applyEffect($model);

            return $model;
        });
    }

    public function deleteTransaction(Transaction $transaction, int $userId): void
    {
        DB::transaction(function () use ($transaction, $userId) {
            $model = Transaction::query()
                ->whereKey($transaction->id)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->reverseEffect($model);
            $model->delete();
        });
    }

    public function applyEffect(Transaction $transaction): void
    {
        if ($transaction->account_id === null) {
            return;
        }

        $this->adjustAccountBalance(
            accountId: (int) $transaction->account_id,
            userId: (int) $transaction->user_id,
            amount: $this->signedAmount($transaction),
        );
    }

    public function reverseEffect(Transaction $transaction): void
    {
        if ($transaction->account_id === null) {
            return;
        }

        $this->adjustAccountBalance(
            accountId: (int) $transaction->account_id,
            userId: (int) $transaction->user_id,
            amount: -1 * $this->signedAmount($transaction),
        );
    }

    private function signedAmount(Transaction $transaction): float
    {
        $amount = (float) $transaction->amount;

        return $transaction->transaction_type === 'income' ? $amount : -1 * $amount;
    }

    private function adjustAccountBalance(int $accountId, int $userId, float $amount): void
    {
        $account = FinancialAccount::query()
            ->whereKey($accountId)
            ->lockForUpdate()
            ->firstOrFail();

        if (! $this->coupleAccess->canAccessAccountByUserId($account, $userId)) {
            abort(404);
        }

        $account->current_balance = (float) $account->current_balance + $amount;
        $account->save();
    }

    private function resolveAccountId(int $userId, ?int $accountId = null): int
    {
        if ($accountId !== null) {
            $account = FinancialAccount::query()->findOrFail($accountId);

            if (! $this->coupleAccess->canAccessAccountByUserId($account, $userId)) {
                abort(404);
            }

            return $accountId;
        }

        $account = FinancialAccount::query()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->lockForUpdate()
            ->first();

        if ($account) {
            return (int) $account->id;
        }

        $account = FinancialAccount::query()->create([
            'user_id' => $userId,
            'name' => 'Dompet utama',
            'type' => 'cash',
            'purpose' => 'daily_spending',
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_default' => true,
            'is_active' => true,
        ]);

        if (! $account->exists) {
            throw new RuntimeException('Default account could not be created.');
        }

        return (int) $account->id;
    }
}
