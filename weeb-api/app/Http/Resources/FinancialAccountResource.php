<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialAccountResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'type' => $this->type,
            'purpose' => $this->purpose,
            'institution_name' => $this->institution_name,
            'account_identifier' => $this->account_identifier,
            'opening_balance' => $this->opening_balance,
            'current_balance' => $this->current_balance,
            'is_default' => $this->is_default,
            'is_active' => $this->is_active,
            'notes' => $this->notes,
        ];
    }
}
