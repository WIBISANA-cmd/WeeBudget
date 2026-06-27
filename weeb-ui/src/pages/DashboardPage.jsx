import {
  Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, RefreshCw, Sparkles,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/utils';
import { compactCurrency, formatCurrency, formatDate } from '../lib/formatters';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const STATUS_MAP = {
  safe:   { label: 'Aman',    desc: 'Ritme bulan ini masih sehat',           cls: 'border-success-base/25 bg-success-base/10 text-success-base' },
  watch:  { label: 'Waspada', desc: 'Masih aman, tapi perlu dijaga',        cls: 'border-warning-base/25 bg-warning-base/10 text-warning-base' },
  tight:  { label: 'Ketat',   desc: 'Utamakan kebutuhan wajib',             cls: 'border-warning-base/25 bg-warning-base/10 text-warning-base' },
  danger: { label: 'Darurat', desc: 'Tahan pengeluaran fleksibel dulu',     cls: 'border-danger-base/25 bg-danger-base/10 text-danger-base' },
};

const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: '1px solid var(--color-border-subtle)',
  backgroundColor: 'var(--color-surface-panel)',
  color: 'var(--color-text-body)',
  boxShadow: 'var(--shadow-card)',
  fontSize: 13,
};

/* ------------------------------------------------------------------ */
/*  Skeleton / Error / Empty                                           */
/* ------------------------------------------------------------------ */
function SkeletonBlock({ className }) {
  return <div className={cn('animate-pulse rounded-2xl bg-surface-100', className)} />;
}

function LoadingDashboard() {
  return (
    <div className="dashboard-fade-in space-y-5">
      <SkeletonBlock className="h-44" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Card className="border-danger-base/30">
      <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-base/10">
          <AlertTriangle className="text-danger-base" size={28} />
        </span>
        <h1 className="text-xl font-semibold text-text-title">Dashboard belum bisa dimuat</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{message}</p>
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow-primary transition-all hover:bg-primary-600 active:scale-[0.97]"
        >
          <RefreshCw size={16} />
          Coba lagi
        </button>
      </CardContent>
    </Card>
  );
}

function EmptyDashboard() {
  return (
    <div className="dashboard-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-title md:text-3xl">Dashboard WeeB</h1>
      </header>
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary-500/20 bg-primary-500/5 p-8 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10">
          <Sparkles className="text-primary-600" size={26} />
        </span>
        <p className="text-lg font-semibold text-text-title">Belum ada data keuangan</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">
          Mulai dari menu Rekening, lalu catat pemasukan atau setoran tabungan pertama.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { dashboard, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <LoadingDashboard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!dashboard || dashboard.is_empty) return <EmptyDashboard />;

  const summary = dashboard.summary;
  const status = STATUS_MAP[dashboard.status] ?? STATUS_MAP.watch;
  const planner = dashboard.budget_planner?.allocations ?? [];
  const focusedBalances = dashboard.focused_balances ?? [];
  const expenseByNeedType = dashboard.expense_by_need_type ?? [];
  const periodLabel = dashboard.period?.label || 'periode aktif';
  const budgetPlannerChart = planner.map((item) => ({
    name: item.label,
    amount: Number(item.amount || 0),
    percent: item.percent,
  }));

  return (
    <div className="dashboard-fade-in space-y-5 pb-4 md:pb-8">
      <section className="dashboard-card-up grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/8 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">
            <Sparkles size={13} />
            {dashboard.period?.label}
          </span>
          <h1 className="max-w-3xl text-[1.75rem] font-bold leading-tight text-text-title md:text-4xl">
            Dashboard saldo dan pola belanja utama
          </h1>
        </div>
        <div className={cn('dashboard-card-up rounded-2xl border px-5 py-3.5', status.cls)} style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest">{status.label}</p>
          <p className="mt-0.5 text-sm font-semibold">{status.desc}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {focusedBalances.map((item, index) => (
          <Card
            key={item.key}
            className={cn(
              'dashboard-card-up overflow-hidden',
              item.key === 'need'
                ? 'border-primary-500/25 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent'
                : 'border-warning-base/25 bg-gradient-to-br from-warning-base/10 via-transparent to-transparent'
            )}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <CardContent className="flex items-start justify-between gap-4 p-5 md:p-6">
              <div>
                <p className="text-sm font-medium text-text-muted">{item.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-text-title md:text-4xl">
                  {formatCurrency(item.total)}
                </p>
                <p className="mt-2 text-sm text-text-muted">{item.account_count} rekening terhubung</p>
              </div>
              <span className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                item.key === 'need' ? 'bg-primary-500/12 text-primary-600' : 'bg-warning-base/12 text-warning-base'
              )}>
                {item.key === 'need' ? <Wallet size={24} /> : <Sparkles size={24} />}
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="dashboard-card-up" style={{ animationDelay: '60ms' }}>
          <CardHeader>
            <CardTitle>Aman Harian</CardTitle>
            <CardDescription>Batas aman belanja sampai akhir {periodLabel.toLowerCase()}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/8 p-4">
              <p className="text-sm font-medium text-text-muted">Nominal aman harian</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-primary-600">
                {formatCurrency(summary.daily_safe_amount)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-100/70 p-4">
                <p className="text-sm text-text-muted">Sisa sampai gajian</p>
                <p className="mt-2 text-xl font-semibold text-text-title">{formatCurrency(summary.net_until_payday)}</p>
              </div>
              <div className="rounded-2xl bg-surface-100/70 p-4">
                <p className="text-sm text-text-muted">Hari menuju gajian</p>
                <p className="mt-2 text-xl font-semibold text-text-title">{summary.days_to_payday} hari</p>
              </div>
            </div>
            <div className="rounded-2xl bg-surface-100/70 p-4 text-sm leading-6 text-text-muted">
              Estimasi gajian berikutnya:
              {' '}
              <span className="font-semibold text-text-title">
                {summary.next_payday ? formatDate(summary.next_payday) : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>Pengeluaran Kebutuhan vs Keinginan</CardTitle>
            <CardDescription>Akumulasi pengeluaran utama selama {periodLabel.toLowerCase()}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByNeedType} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={44} fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="amount" radius={[10, 10, 0, 0]} animationDuration={1000} fill="var(--color-primary-500)" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {expenseByNeedType.map((item) => (
                <div key={item.key} className="rounded-2xl bg-surface-100/70 p-4">
                  <p className="text-sm text-text-muted">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-text-title">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="dashboard-card-up" style={{ animationDelay: '140ms' }}>
          <CardHeader>
            <CardTitle>Budget Planner</CardTitle>
            <CardDescription>Alokasi dana utama berdasarkan perencanaan bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="h-[280px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetPlannerChart} layout="vertical" margin={{ top: 10, right: 24, left: 20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border-subtle)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} width={100} fontSize={12} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="amount" fill="var(--color-primary-500)" radius={[0, 10, 10, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {planner.map((item, index) => (
                <div key={item.key} className="rounded-2xl border border-border-subtle bg-surface-100/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-text-title">{item.label}</p>
                    <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-bold text-primary-600">{item.percent}%</span>
                  </div>
                  <p className="mt-2.5 text-xl font-bold tabular-nums text-text-title">{formatCurrency(item.amount)}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-300">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
                      style={{ width: `${item.percent}%`, transitionDelay: `${index * 70}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
