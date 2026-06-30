<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBudgetPlannerAllocationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.key' => ['required', 'string', 'max:50'],
            'allocations.*.percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'base_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
        ];
    }
}
