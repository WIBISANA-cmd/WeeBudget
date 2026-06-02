<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'category_id' => ['nullable', Rule::exists('transaction_categories', 'id')->where(fn ($query) => $query->where('user_id', $userId)->orWhereNull('user_id'))],
            'name' => ['required', 'string', 'max:120'],
            'amount_estimate' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'due_day' => ['nullable', 'integer', 'between:1,31'],
            'next_due_date' => ['nullable', 'date'],
            'frequency' => ['nullable', Rule::in(['weekly', 'monthly', 'yearly', 'once'])],
            'reminder_days' => ['nullable', 'array'],
            'reminder_days.*' => ['integer', 'min:0', 'max:30'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'archived'])],
        ];
    }
}
