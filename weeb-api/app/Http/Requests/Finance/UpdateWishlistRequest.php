<?php

namespace App\Http\Requests\Finance;

class UpdateWishlistRequest extends StoreWishlistRequest
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
