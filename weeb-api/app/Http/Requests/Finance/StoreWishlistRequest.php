<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWishlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'estimated_amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'need_type' => ['nullable', Rule::in(['need', 'want'])],
            'waiting_days' => ['nullable', 'integer', 'between:0,90'],
            'waiting_until' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['waiting', 'approved', 'converted_to_goal', 'bought', 'cancelled'])],
            'impact_snapshot' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
