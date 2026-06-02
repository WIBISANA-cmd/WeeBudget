<?php

namespace App\Http\Requests\Finance;

class UpdateFinancialPeriodRequest extends StoreFinancialPeriodRequest
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
