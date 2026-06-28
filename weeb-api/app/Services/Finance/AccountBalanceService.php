<?php

namespace App\Services\Finance;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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

            $counterpart = $this->findAllocationCounterpart($model, $userId);

            $this->reverseEffect($model);
            $model->delete();

            if ($counterpart !== null) {
                $this->reverseEffect($counterpart);
                $counterpart->delete();
            } else {
                $counterpartAccountId = data_get($model->metadata, 'counterpart_account_id');
                if ($counterpartAccountId && data_get($model->metadata, 'direction') === 'out') {
                    $this->adjustAccountBalance(
                        accountId: (int) $counterpartAccountId,
                        userId: $userId,
                        amount: -1 * $model->amount,
                    );
                }
            }
        });
    }

    public function allocateBetweenAccounts(array $data, int $userId): array
    {
        return DB::transaction(function () use ($data, $userId) {
            $sourceAccount = $this->lockedAccessibleAccount((int) $data['source_account_id'], $userId);
            $destinationAccount = $this->lockedAccessibleAccount((int) $data['destination_account_id'], $userId);
            $amount = (float) $data['amount'];
            $actorLabel = $this->allocationActorLabel($userId);

            if ((float) $sourceAccount->current_balance < $amount) {
                throw ValidationException::withMessages([
                    'amount' => 'Saldo rekening sumber tidak mencukupi untuk alokasi ini.',
                ]);
            }

            $date = $data['transaction_date'];
            $notes = $data['notes'] ?? null;

            $outgoing = Transaction::query()->create([
                'user_id' => $userId,
                'account_id' => $sourceAccount->id,
                'transaction_type' => 'expense',
                'amount' => $amount,
                'need_type' => null,
                'transaction_date' => $date,
                'description' => sprintf('Alokasi ke %s', $destinationAccount->name),
                'notes' => $notes,
                'source' => 'account_allocation',
                'metadata' => [
                    'direction' => 'out',
                    'actor_label' => $actorLabel,
                    'actor_user_id' => $userId,
                    'counterpart_account_id' => $destinationAccount->id,
                    'counterpart_account_name' => $destinationAccount->name,
                ],
            ]);

            $this->applyEffect($outgoing);

            // Adjust destination account balance directly without creating an incoming transaction
            $this->adjustAccountBalance(
                accountId: $destinationAccount->id,
                userId: $userId,
                amount: $amount,
            );

            return [
                'source_account' => $sourceAccount->fresh(),
                'destination_account' => $destinationAccount->fresh(),
                'transactions' => [$outgoing],
            ];
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

    private function lockedAccessibleAccount(int $accountId, int $userId): FinancialAccount
    {
        $account = FinancialAccount::query()
            ->whereKey($accountId)
            ->lockForUpdate()
            ->firstOrFail();

        if (! $this->coupleAccess->canAccessAccountByUserId($account, $userId)) {
            abort(404);
        }

        return $account;
    }

    private function findAllocationCounterpart(Transaction $transaction, int $userId): ?Transaction
    {
        if ($transaction->source !== 'account_allocation') {
            return null;
        }

        $counterpartId = data_get($transaction->metadata, 'counterpart_transaction_id');
        $direction = data_get($transaction->metadata, 'direction');
        $counterpartDirection = $direction === 'out' ? 'in' : 'out';

        return Transaction::query()
            ->where('user_id', $userId)
            ->where('source', 'account_allocation')
            ->whereKeyNot($transaction->id)
            ->when(
                $counterpartId,
                fn ($query, $id) => $query->whereKey($id),
                fn ($query) => $query
                    ->where('account_id', data_get($transaction->metadata, 'counterpart_account_id'))
                    ->where('amount', $transaction->amount)
                    ->whereDate('transaction_date', $transaction->transaction_date)
                    ->where('metadata->direction', $counterpartDirection)
            )
            ->lockForUpdate()
            ->first();
    }

    private function allocationActorLabel(int $userId): string
    {
        $user = \App\Models\User::query()->find($userId);

        return $user?->email ?: $user?->name ?: 'Pengguna WeeB';
    }

    private function allocationNeedType(FinancialAccount $destinationAccount): ?string
    {
        return match ($destinationAccount->purpose) {
            'savings', 'couple_savings', 'emergency_fund' => 'saving',
            default => null,
        };
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
