<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'month' => ['required', 'date'],
            'planned_income' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'planned_expense' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'daily_safe_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'status' => ['nullable', Rule::in(['draft', 'active', 'closed'])],
            'categories' => ['nullable', 'array'],
            'categories.*.category_id' => ['required_with:categories', Rule::exists('transaction_categories', 'id')->where(fn ($query) => $query->where('user_id', $userId)->orWhereNull('user_id'))],
            'categories.*.allocated_amount' => ['required_with:categories', 'numeric', 'min:0', 'max:999999999999.99'],
            'categories.*.allocation_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
