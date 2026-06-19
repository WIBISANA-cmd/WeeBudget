<?php

namespace App\Http\Requests\Finance;

use App\Models\FinancialAccount;
use App\Services\Finance\CoupleSavingsAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAccountAllocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source_account_id' => ['required', 'integer'],
            'destination_account_id' => ['required', 'integer', 'different:source_account_id'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->user()) {
                return;
            }

            $accessService = app(CoupleSavingsAccessService::class);

            foreach (['source_account_id', 'destination_account_id'] as $field) {
                if ($validator->errors()->has($field) || ! $this->filled($field)) {
                    continue;
                }

                $account = FinancialAccount::query()->find($this->integer($field));
                $canAccess = $account !== null && $accessService->canAccessAccount($account, $this->user());

                if (! $canAccess) {
                    $validator->errors()->add($field, sprintf('The selected %s is invalid.', str_replace('_', ' ', $field)));
                }
            }
        });
    }
}
