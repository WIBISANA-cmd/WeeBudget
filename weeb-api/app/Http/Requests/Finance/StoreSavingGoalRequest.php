<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSavingGoalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'type' => ['nullable', Rule::in(['saving', 'emergency_fund', 'wishlist'])],
            'target_amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'current_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'target_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'integer', 'between:1,5'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'completed', 'cancelled'])],
        ];
    }
}
