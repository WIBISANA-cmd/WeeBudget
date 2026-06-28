<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Resources\MonthlyReportResource;
use App\Models\MonthlyReport;
use App\Services\Finance\MonthlyReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonthlyReportController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = MonthlyReport::query()
            ->where('user_id', $request->user()->id)
            ->latest('month');

        $paginator = $query->paginate($this->perPage($request, 12));

        return $this->paginated(MonthlyReportResource::collection($paginator), $paginator, 'Monthly reports loaded.');
    }

    public function show(Request $request, MonthlyReportService $service): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()))->startOfMonth();
        $report = $service->generate($request->user(), $month);

        return $this->success(new MonthlyReportResource($report), 'Monthly report generated.');
    }
}
