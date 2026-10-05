import { AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import PageHeader from '../components/layout/PageHeader';
import { Skeleton } from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '../lib/formatters';
import { cn } from '../lib/utils';

const HEALTH_LABELS = {
  aman: 'Aman',
  cukup_sehat: 'Cukup sehat',
  waspada: 'Waspada',
  perlu_diketatkan: 'Perlu diketatkan',
};

const PAYDAY_STATUS = { safe: 'Aman', watch: 'Waspada', tight: 'Ketat', danger: 'Darurat' };

const TONES = {
  success: { bar: 'bg-success-base', badge: 'bg-success-soft text-success-base' },
  primary: { bar: 'bg-primary-500', badge: 'bg-primary-soft text-primary-600' },
  warning: { bar: 'bg-warning-base', badge: 'bg-warning-soft text-warning-base' },
  danger: { bar: 'bg-danger-base', badge: 'bg-danger-soft text-danger-base' },
};

const noteClass = 'flex items-start gap-3 p-4';

function InsightsSkeleton() {
  return (
    <>
      <Card>
        <CardContent className="grid gap-5 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
          <div>
            <div className="flex items-end justify-between gap-3">
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            {['w-20', 'w-24', 'w-24', 'w-20'].map((width, index) => (
              <div key={index}>
                <Skeleton className={cn('h-3.5', width)} />
                <Skeleton className="mt-2 h-5 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        {['w-full', 'w-5/6', 'w-full', 'w-4/6'].map((width, index) => (
          <Card key={index}>
            <div className={noteClass}>
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className={cn('h-3.5', width)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function InsightsPage() {
  // Same payload as /dashboard/insights, minus a second full dashboard computation on the server.
  // Arriving from Home renders from the dashboard cache with no request at all.
  const { dashboard: data, isLoading, error, refetch } = useDashboard();

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const health = data?.health_score;
  const score = Number(health?.score || 0);
  const tone = TONES[score >= 80 ? 'success' : score >= 60 ? 'primary' : score >= 40 ? 'warning' : 'danger'];
  const components = health?.components || {};
  const facts = [
    { label: 'Pemasukan', value: formatCurrency(components.income) },
    { label: 'Pengeluaran', value: formatCurrency(components.expense) },
    { label: 'Dana darurat', value: formatCurrency(components.emergency_fund) },
    { label: 'Sampai gajian', value: PAYDAY_STATUS[components.payday_status] || '-' },
  ];
  const insights = data?.insights || [];
  const warnings = data?.budget_warnings || [];

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader title="Insight" />

      {isLoading ? <InsightsSkeleton /> : (
        <>
          <Card>
            <CardContent className="grid gap-5 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <p className="font-outfit text-5xl font-semibold tabular-nums text-text-title">
                    {score}<span className="text-base font-medium text-text-muted">/100</span>
                  </p>
                  <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', tone.badge)}>
                    {HEALTH_LABELS[health?.label] || health?.label}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-200">
                  <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-sm text-text-muted">{fact.label}</dt>
                    <dd className="mt-0.5 truncate text-base font-semibold tabular-nums text-text-title">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {insights.length === 0 && warnings.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-sm text-text-muted">Belum ada catatan untuk periode ini.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {warnings.map((warning) => (
                <Card key={`warning-${warning.category_id}`}>
                  <div className={noteClass}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-base">
                      <AlertTriangle size={18} />
                    </span>
                    <p className="pt-1 text-sm leading-6 text-text-body">
                      <span className="font-semibold text-text-title">{warning.category_name}</span> sudah {Math.round(warning.usage_percent)}% dari budget
                      ({formatCurrency(warning.spent_amount)} dari {formatCurrency(warning.allocated_amount)}).
                    </p>
                  </div>
                </Card>
              ))}
              {insights.map((insight) => (
                <Card key={insight}>
                  <div className={noteClass}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-600">
                      <Lightbulb size={18} />
                    </span>
                    <p className="pt-1 text-sm leading-6 text-text-body">{insight}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
