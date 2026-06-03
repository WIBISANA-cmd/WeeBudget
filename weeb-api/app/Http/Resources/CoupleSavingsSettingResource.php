<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CoupleSavingsSettingResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'partner_one_user_id' => $this->partner_one_user_id,
            'partner_two_user_id' => $this->partner_two_user_id,
            'partner_one' => $this->whenLoaded('partnerOne', fn () => new UserResource($this->partnerOne)),
            'partner_two' => $this->whenLoaded('partnerTwo', fn () => new UserResource($this->partnerTwo)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
