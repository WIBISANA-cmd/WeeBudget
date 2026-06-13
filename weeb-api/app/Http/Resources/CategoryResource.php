<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'transaction_type' => $this->transaction_type,
            'need_type' => $this->need_type,
            'account' => $this->whenLoaded('account', fn () => [
                'id' => $this->account?->id,
                'name' => $this->account?->name,
            ]),
            'icon' => $this->icon,
            'color' => $this->color,
            'is_default' => $this->is_default,
            'sort_order' => $this->sort_order,
        ];
    }
}
