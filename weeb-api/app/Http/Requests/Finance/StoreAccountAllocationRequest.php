<?php

namespace App\Http\Requests\Finance;

use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountAllocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'source_account_id' => [
                'required',
                'integer',
                Rule::exists('financial_accounts', 'id')->where(fn (Builder $query) => $query->where('user_id', $userId)),
            ],
            'destination_account_id' => [
                'required',
                'integer',
                'different:source_account_id',
                Rule::exists('financial_accounts', 'id')->where(fn (Builder $query) => $query->where('user_id', $userId)),
            ],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
