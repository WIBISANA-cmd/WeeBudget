<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'currency' => $this->currency,
            'timezone' => $this->timezone,
            'payday_day' => $this->payday_day,
            'payday_frequency' => $this->payday_frequency,
            'monthly_income_estimate' => $this->monthly_income_estimate,
            'daily_safe_amount_target' => $this->daily_safe_amount_target,
            'onboarding_completed_at' => $this->onboarding_completed_at?->toDateString(),
        ];
    }
}
