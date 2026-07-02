import {
  Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, RefreshCw, Sparkles,
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
  const accountBalances = dashboard.account_balances ?? [];
  const focusedBalances = dashboard.focused_balances ?? [];
  const expenseByNeedType = dashboard.expense_by_need_type ?? [];
  const periodLabel = dashboard.period?.label || 'periode aktif';
  const accountCashflowChart = accountBalances.map((item) => ({
    name: item.name,
    pemasukan: Number(item.income || 0),
    pengeluaran: Number(item.expense || 0),
    saldo: Number(item.balance || 0),
  }));

  return (
    <div className="dashboard-fade-in space-y-5 pb-4 md:pb-8">
      <section className="dashboard-card-up grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/8 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">
            <Sparkles size={13} />
            {dashboard.period?.label}
          </span>
        </div>
        <div className={cn('dashboard-card-up rounded-2xl border px-5 py-3.5', status.cls)} style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest">{status.label}</p>
          <p className="mt-0.5 text-sm font-semibold">{status.desc}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {focusedBalances.map((item, index) => {
          const isNeed = item.key === 'need';
          return (
            <Card
              key={item.key}
              className={cn(
                'dashboard-card-up overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-md border',
                isNeed
                  ? 'border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-surface-panel/40 to-surface-panel/90 shadow-sm shadow-indigo-500/5 dark:border-indigo-500/30 dark:from-indigo-950/40 dark:via-surface-panel dark:to-surface-panel'
                  : 'border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-surface-panel/40 to-surface-panel/90 shadow-sm shadow-amber-500/5 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-surface-panel dark:to-surface-panel'
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <CardContent className="flex items-center justify-between gap-4 p-5 md:p-6">
                <div className="space-y-1.5">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isNeed
                      ? 'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                      : 'bg-amber-500/12 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', isNeed ? 'bg-indigo-500' : 'bg-amber-500')} />
                    {item.label}
                  </span>
                  <p className="text-3xl font-bold tracking-tight text-text-title md:text-4xl">
                    {formatCurrency(item.total)}
                  </p>
                  <p className="text-xs text-text-muted font-medium">
                    {item.account_count} rekening terhubung
                  </p>
                </div>
                <div className="shrink-0 transition-transform duration-300 hover:scale-110">
                  {isNeed ? (
                    <svg className="w-14 h-14 drop-shadow-md" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="walletBody" x1="4" y1="10" x2="44" y2="38" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#4338CA" />
                        </linearGradient>
                        <linearGradient id="walletFlap" x1="22" y1="16" x2="44" y2="32" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#4F46E5" />
                        </linearGradient>
                      </defs>
                      {/* Main Wallet Body */}
                      <rect x="4" y="10" width="40" height="28" rx="6" fill="url(#walletBody)" />
                      {/* Cash peeking out */}
                      <path d="M12 10V7.5C12 6.67157 12.6716 6 13.5 6H34.5C35.3284 6 36 6.67157 36 7.5V10" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />
                      <path d="M16 10V8.5C16 8.22386 16.2239 8 16.5 8H31.5C31.7761 8 32 8.22386 32 8.5V10" stroke="#EEF2FF" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Leather Flap */}
                      <path d="M26 16H40C42.2091 16 44 17.7909 44 20V28C44 30.2091 42.2091 32 40 32H26C23.7909 32 22 30.2091 22 28V20C22 17.7909 23.7909 16 26 16Z" fill="url(#walletFlap)" />
                      {/* Gold Badge */}
                      <circle cx="34" cy="24" r="3.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
                      <circle cx="34" cy="24" r="1" fill="#FFF" />
                    </svg>
                  ) : (
                    <svg className="w-14 h-14 drop-shadow-md" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="bagBody" x1="6" y1="14" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        <linearGradient id="bagHandle" x1="16" y1="4" x2="32" y2="14" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FEF3C7" />
                          <stop offset="100%" stopColor="#FBBF24" />
                        </linearGradient>
                      </defs>
                      {/* Bag Handles */}
                      <path d="M16 14V10C16 5.58172 19.5817 2 24 2C28.4183 2 32 5.58172 32 10V14" stroke="url(#bagHandle)" strokeWidth="3" strokeLinecap="round" />
                      {/* Main Bag Body */}
                      <path d="M6 14L8.5 41C8.7 42.7 10.1 44 11.8 44H36.2C37.9 44 39.3 42.7 39.5 41L42 14H6Z" fill="url(#bagBody)" />
                      {/* Decorative Ribbon/Star */}
                      <path d="M24 22L25.8 26.5L30.5 27L27 30.2L28.2 35L24 32.5L19.8 35L21 30.2L17.5 27L22.2 26.5L24 22Z" fill="#FFF" fillOpacity="0.9" />
                    </svg>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
            <CardTitle>Saldo Rekening & Cashflow</CardTitle>
            <CardDescription>Saldo setiap rekening aktif dan arus pemasukan-pengeluaran selama {periodLabel.toLowerCase()}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[280px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountCashflowChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={12} interval={0} angle={accountCashflowChart.length > 4 ? -16 : 0} textAnchor={accountCashflowChart.length > 4 ? 'end' : 'middle'} height={accountCashflowChart.length > 4 ? 56 : 30} />
                  <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={44} fontSize={12} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="var(--color-success-base)" radius={[8, 8, 0, 0]} animationDuration={1000} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--color-primary-500)" radius={[8, 8, 0, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {accountBalances.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-subtle bg-surface-100/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-text-title">{item.name}</p>
                    <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-bold text-primary-600">{item.purpose_label}</span>
                  </div>
                  <p className="mt-2.5 text-xl font-bold tabular-nums text-text-title">{formatCurrency(item.balance)}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-surface-panel px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Masuk</p>
                      <p className="mt-1 text-sm font-semibold text-success-base">{formatCurrency(item.income)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-panel px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Keluar</p>
                      <p className="mt-1 text-sm font-semibold text-primary-600">{formatCurrency(item.expense)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-panel px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Net</p>
                      <p className={cn('mt-1 text-sm font-semibold', item.net >= 0 ? 'text-success-base' : 'text-danger-base')}>
                        {formatCurrency(item.net)}
                      </p>
                    </div>
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
