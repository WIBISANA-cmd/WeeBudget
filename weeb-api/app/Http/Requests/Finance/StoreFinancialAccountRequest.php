<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinancialAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'type' => ['required', Rule::in(['cash', 'bank', 'e_wallet', 'digital_bank', 'other'])],
            'purpose' => ['required', Rule::in([
                'daily_spending',
                'salary',
                'savings',
                'couple_savings',
                'emergency_fund',
                'bills',
                'wishlist',
                'investment',
                'other',
            ])],
            'institution_name' => ['nullable', 'string', 'max:100'],
            'account_identifier' => ['nullable', 'string', 'max:80'],
            'opening_balance' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'current_balance' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'is_default' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
