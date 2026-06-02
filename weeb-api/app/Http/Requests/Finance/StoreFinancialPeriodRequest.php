<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinancialPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'payday_date' => ['nullable', 'date'],
            'opening_balance' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'income_target' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'expense_limit' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'status' => ['nullable', Rule::in(['planned', 'active', 'closed'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
