<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'account_id' => ['nullable', Rule::exists('financial_accounts', 'id')->where('user_id', $userId)],
            'category_id' => ['nullable', Rule::exists('transaction_categories', 'id')->where(fn ($query) => $query->where('user_id', $userId)->orWhereNull('user_id'))],
            'name' => ['required', 'string', 'max:120'],
            'transaction_type' => ['required', Rule::in(['income', 'expense'])],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'frequency' => ['nullable', Rule::in(['daily', 'weekly', 'monthly', 'yearly'])],
            'day_of_month' => ['nullable', 'integer', 'between:1,31'],
            'next_run_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'archived'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
