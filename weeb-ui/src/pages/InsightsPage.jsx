import { AlertTriangle, Lightbulb, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Shimmer } from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import StatusBadge from '../components/feedback/StatusBadge';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '../lib/formatters';

export default function InsightsPage() {
  // Same payload as /dashboard/insights, minus a second full dashboard computation on the server.
  // Arriving from Home renders from the dashboard cache with no request at all.
  const { dashboard: data, isLoading, error } = useDashboard();

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-title">Insight Keuangan</h1>
        <p className="mt-2 text-text-muted">Ringkasan cerdas yang jujur, singkat, dan tidak menghakimi.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
          <CardDescription>Skor sederhana berdasarkan ritme uang bulan ini.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {isLoading ? <Shimmer className="h-20 w-full" /> : (
          <>
          <div>
            <p className="text-5xl font-bold text-primary-600">{data?.health_score?.score}</p>
            <StatusBadge value="safe">{data?.health_score?.label}</StatusBadge>
          </div>
          <div className="grid gap-2 text-sm text-text-muted md:grid-cols-2">
            <span>Pemasukan: {formatCurrency(data?.health_score?.components?.income)}</span>
            <span>Pengeluaran: {formatCurrency(data?.health_score?.components?.expense)}</span>
            <span>Dana darurat: {formatCurrency(data?.health_score?.components?.emergency_fund)}</span>
            <span>Status gajian: {data?.health_score?.components?.payday_status}</span>
          </div>
          </>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading && [0, 1].map((index) => (
          <Card key={index}>
            <CardContent><Shimmer className="h-12 w-full" /></CardContent>
          </Card>
        ))}
        {(data?.insights || []).map((insight) => (
          <Card key={insight} className="border-primary-500">
            <CardContent className="flex gap-3">
              <Lightbulb className="shrink-0 text-primary-600" />
              <p className="text-sm leading-6 text-text-body">{insight}</p>
            </CardContent>
          </Card>
        ))}
        {(data?.budget_warnings || []).map((warning) => (
          <Card key={warning.category_id} className="border-warning-base">
            <CardContent className="flex gap-3">
              <AlertTriangle className="shrink-0 text-warning-base" />
              <p className="text-sm leading-6 text-text-body">{warning.category_name} sudah {warning.usage_percent}% dari budget.</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-success-base">
          <CardContent className="flex gap-3">
            <ShieldCheck className="shrink-0 text-success-base" />
            <p className="text-sm leading-6 text-text-body">Langkah kecil hari ini tetap dihitung. Fokus pada batas aman harian dan tagihan terdekat.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
