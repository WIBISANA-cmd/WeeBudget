<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'monthly_income_estimate' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'payday_day' => ['required', 'integer', 'between:1,31'],
            'daily_safe_amount_target' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'account_mode' => ['required', Rule::in(['personal', 'couple'])],
            'financial_priority' => ['nullable', Rule::in(['survive_until_payday', 'reduce_spending', 'build_emergency_fund', 'pay_debt', 'save_for_goal'])],
            'saving_goal_name' => ['nullable', 'string', 'max:120'],
            'saving_goal_target' => ['nullable', 'numeric', 'gt:0', 'max:999999999999.99'],
            'emergency_fund_target' => ['nullable', 'numeric', 'gt:0', 'max:999999999999.99'],
        ];
    }
}
