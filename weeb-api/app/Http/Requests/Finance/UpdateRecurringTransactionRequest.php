<?php

namespace App\Http\Requests\Finance;

class UpdateRecurringTransactionRequest extends StoreRecurringTransactionRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        foreach ($rules as $field => $fieldRules) {
            $rules[$field] = array_map(fn ($rule) => $rule === 'required' ? 'sometimes' : $rule, $fieldRules);
        }

        return $rules;
    }
}
