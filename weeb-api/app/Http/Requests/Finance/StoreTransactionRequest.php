<?php

namespace App\Http\Requests\Finance;

use App\Models\FinancialAccount;
use App\Services\Finance\CoupleSavingsAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'account_id' => ['required', 'integer'],
            'category_id' => ['nullable', Rule::exists('transaction_categories', 'id')->where(fn ($query) => $query->where('user_id', $userId)->orWhereNull('user_id'))],
            'recurring_transaction_id' => ['nullable', Rule::exists('recurring_transactions', 'id')->where('user_id', $userId)],
            'bill_id' => ['nullable', Rule::exists('bills', 'id')->where('user_id', $userId)],
            'saving_goal_id' => ['nullable', Rule::exists('saving_goals', 'id')->where('user_id', $userId)],
            'wishlist_id' => ['nullable', Rule::exists('wishlists', 'id')->where('user_id', $userId)],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'need_type' => ['nullable', Rule::in(['need', 'want', 'saving', 'debt'])],
            'transaction_date' => ['required', 'date'],
            'occurred_at' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'source' => ['nullable', 'string', 'max:80'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->has('account_id') || ! $this->filled('account_id') || ! $this->user()) {
                return;
            }

            $account = FinancialAccount::query()->find($this->integer('account_id'));
            $canAccess = $account !== null
                && app(CoupleSavingsAccessService::class)->canAccessAccount($account, $this->user());

            if (! $canAccess) {
                $validator->errors()->add('account_id', 'The selected account is invalid.');
            }
        });
    }
}
