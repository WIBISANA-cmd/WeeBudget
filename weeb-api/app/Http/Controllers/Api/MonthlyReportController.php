<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Resources\MonthlyReportResource;
use App\Models\Transaction;
use App\Services\Finance\MonthlyReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonthlyReportController extends Controller
{
    use RespondsWithApi;

    /**
     * Totals per day or per month inside a date range, straight from the transactions rather
     * than from the monthly_reports rows: those are snapshots written the last time someone
     * opened a month, so a month that gained transactions afterwards reported stale numbers.
     *
     * Each bucket also carries `cumulative_amount`: the running balance where income adds up
     * and expenses draw it down, opened with the net of everything before the range so money
     * earned last month still funds this month's spending.
     *
     * `group=day` keeps a short range honest — a month bucket over a range that only covers
     * part of that month draws a bar labelled with the whole month but holding a slice of it.
     * Day grouping is capped at 92 buckets and falls back to months beyond that.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
            'months' => ['nullable', 'integer', 'min:1', 'max:24'],
            'group' => ['nullable', 'in:day,month'],
        ]);

        $months = (int) ($validated['months'] ?? 12);
        $end = isset($validated['end'])
            ? CarbonImmutable::parse($validated['end'])->endOfDay()
            : CarbonImmutable::now()->endOfDay();
        $start = isset($validated['start'])
            ? CarbonImmutable::parse($validated['start'])->startOfDay()
            : $end->startOfMonth()->subMonthsNoOverflow($months - 1);

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->startOfDay(), $start->endOfDay()];
        }

        $rows = Transaction::query()
            ->where('user_id', $request->user()->id)
            ->whereBetween('transaction_date', [$start, $end])
            ->countedInReports()
            ->get(['transaction_date', 'transaction_type', 'need_type', 'amount']);

        $byDay = ($validated['group'] ?? 'month') === 'day' && $start->diffInDays($end) < 92;

        $totals = [];
        $bucket = $byDay ? $start->startOfDay() : $start->startOfMonth();
        while ($bucket->lessThanOrEqualTo($end)) {
            $totals[$bucket->toDateString()] = [
                'period' => $bucket->toDateString(),
                'total_income' => 0.0,
                'total_expense' => 0.0,
                'total_saving' => 0.0,
            ];
            $bucket = $byDay ? $bucket->addDay() : $bucket->addMonthNoOverflow();
        }

        foreach ($rows as $row) {
            $date = CarbonImmutable::parse($row->transaction_date);
            $key = ($byDay ? $date->startOfDay() : $date->startOfMonth())->toDateString();
            if (! isset($totals[$key])) {
                continue;
            }

            $amount = (float) $row->amount;
            if ($row->transaction_type === 'income') {
                $totals[$key]['total_income'] += $amount;
            } elseif ($row->transaction_type === 'expense') {
                $totals[$key]['total_expense'] += $amount;
                if ($row->need_type === 'saving') {
                    $totals[$key]['total_saving'] += $amount;
                }
            }
        }

        // Opening balance: everything earned minus everything spent before this range.
        $running = (float) Transaction::query()
            ->where('user_id', $request->user()->id)
            ->where('transaction_date', '<', $start)
            ->countedInReports()
            ->selectRaw("coalesce(sum(case when transaction_type = 'income' then amount when transaction_type = 'expense' then -amount else 0 end), 0) as net")
            ->value('net');

        $data = [];
        foreach ($totals as $period) {
            $running += $period['total_income'] - $period['total_expense'];

            $data[] = [
                ...$period,
                'granularity' => $byDay ? 'day' : 'month',
                'total_income' => round($period['total_income'], 2),
                'total_expense' => round($period['total_expense'], 2),
                'total_saving' => round($period['total_saving'], 2),
                'remaining_amount' => round($period['total_income'] - $period['total_expense'], 2),
                'cumulative_amount' => round($running, 2),
            ];
        }

        return $this->success($data, 'Reports loaded.');
    }

    public function show(Request $request, MonthlyReportService $service): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()))->startOfMonth();
        $report = $service->generate($request->user(), $month);

        return $this->success(new MonthlyReportResource($report), 'Monthly report generated.');
    }
}
