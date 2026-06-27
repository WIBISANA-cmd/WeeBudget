<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'timezone' => ['sometimes', 'string', 'max:80'],
            'payday_day' => ['nullable', 'integer', 'between:1,31'],
            'payday_frequency' => ['sometimes', Rule::in(['weekly', 'biweekly', 'monthly'])],
            'monthly_income_estimate' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'daily_safe_amount_target' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'account_mode' => ['sometimes', Rule::in(['personal', 'couple'])],
            'transaction_reminder_enabled' => ['sometimes', 'boolean'],
            'transaction_reminder_time' => ['nullable', 'date_format:H:i'],
            'onboarding_completed_at' => ['nullable', 'date'],
        ];
    }
}
