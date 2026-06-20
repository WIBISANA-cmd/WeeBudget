<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $isAdmin = ($request->user()?->role ?? 'user') === 'admin';
        $isShared = $this->user_id === null && ! $this->is_default;
        $canManage = ($isAdmin && ! $this->is_default)
            || (int) $this->user_id === (int) $request->user()?->id;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
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
            'is_shared' => $isShared,
            'can_manage' => $canManage,
            'sort_order' => $this->sort_order,
        ];
    }
}
