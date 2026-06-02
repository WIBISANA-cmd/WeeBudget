<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyReportResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'month' => $this->month?->toDateString(),
            'total_income' => $this->total_income,
            'total_expense' => $this->total_expense,
            'total_saving' => $this->total_saving,
            'remaining_amount' => $this->remaining_amount,
            'financial_health_score' => $this->financial_health_score,
            'summary' => $this->summary,
            'generated_at' => $this->generated_at?->toISOString(),
        ];
    }
}
