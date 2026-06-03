<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCoupleSavingsSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'partner_one_user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('status', 'active')],
            'partner_two_user_id' => [
                'required',
                'integer',
                'different:partner_one_user_id',
                Rule::exists('users', 'id')->where('status', 'active'),
            ],
        ];
    }
}
