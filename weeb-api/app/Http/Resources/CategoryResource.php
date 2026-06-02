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
            'name' => $this->name,
            'slug' => $this->slug,
            'transaction_type' => $this->transaction_type,
            'need_type' => $this->need_type,
            'icon' => $this->icon,
            'color' => $this->color,
            'is_default' => $this->is_default,
            'sort_order' => $this->sort_order,
        ];
    }
}
