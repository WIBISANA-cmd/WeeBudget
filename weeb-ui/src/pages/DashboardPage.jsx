import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock,
  CheckCircle2, CircleDollarSign, CreditCard, Lightbulb,
  PiggyBank, RefreshCw, ShieldCheck, Sparkles, TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/utils';
import { compactCurrency, formatCurrency, formatDate } from '../lib/formatters';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const COLORS = ['#3C83F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#22C55E'];

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

function EmptyDashboard({ name }) {
  return (
    <div className="dashboard-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-title md:text-3xl">Dashboard WeeB</h1>
        <p className="mt-2 text-text-muted">Buat rekening atau catat transaksi pertama agar dashboard mulai membaca pola uangmu.</p>
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
/*  Helper: week label formatter                                       */
/* ------------------------------------------------------------------ */
function weekLabel(value) {
  const w = String(value || '').replace(/^M/i, '');
  return w ? `Minggu ${w}` : '-';
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatCard({ icon: Icon, label, value, sub, tone, delay = 0 }) {
  return (
    <Card className="dashboard-card-up group" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="flex items-start gap-3.5 p-4 md:p-5">
        <span className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
          'bg-surface-100',
          tone,
        )}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-text-title md:text-2xl">{value}</p>
          {sub && <p className="mt-1 text-[13px] leading-5 text-text-muted">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniChart({ data, dataKey, stroke, gradientId }) {
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-text-muted">Belum ada data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="week" hide />
        <YAxis hide domain={[0, 'dataMax']} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          fill={`url(#${gradientId})`}
          strokeWidth={2.5}
          dot={false}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CashflowCard({ icon: Icon, label, value, tone, badge, badgeCls, chartData, dataKey, gradientId, stroke, helper, delay = 0 }) {
  return (
    <Card className="dashboard-card-up group" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="space-y-3.5 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 transition-transform duration-300 group-hover:scale-110', tone)}>
              <Icon size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-muted">{label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-text-title">{value}</p>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', badgeCls)}>
            {badge}
          </span>
        </div>

        <div className="h-[72px] overflow-hidden rounded-xl bg-surface-100 p-1.5">
          <MiniChart data={chartData} dataKey={dataKey} stroke={stroke} gradientId={gradientId} />
        </div>

        <p className="text-[13px] leading-5 text-text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, current, target, icon: Icon, tone, accentCls, delay = 0 }) {
  const pct = Math.min(Math.round((Number(current || 0) / Math.max(Number(target || 1), 1)) * 100), 100);

  return (
    <div className="dashboard-card-up rounded-2xl border border-border-subtle bg-surface-100/70 p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone)}>
            <Icon size={18} />
          </span>
          <div>
            <p className="font-semibold text-text-title">{label}</p>
            <p className="text-[13px] text-text-muted">{formatCurrency(current)} / {formatCurrency(target)}</p>
          </div>
        </div>
        <span className={cn('text-sm font-bold', tone)}>{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-300">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', accentCls)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TransactionRow({ item, delay = 0 }) {
  const isIncome = item.transaction_type === 'income';
  return (
    <div
      className="dashboard-card-up flex items-center justify-between gap-3 rounded-2xl bg-surface-100/70 p-3 transition-colors hover:bg-surface-200/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          isIncome ? 'bg-success-base/10 text-success-base' : 'bg-danger-base/10 text-danger-base',
        )}>
          <CreditCard size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-title">{item.description}</p>
          <p className="text-xs text-text-muted">{formatDate(item.transaction_date)} · {item.account_name || '-'}</p>
        </div>
      </div>
      <p className={cn('shrink-0 text-sm font-bold tabular-nums', isIncome ? 'text-success-base' : 'text-danger-base')}>
        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
      </p>
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
  if (!dashboard || dashboard.is_empty) return <EmptyDashboard name={dashboard?.user?.name} />;

  const summary          = dashboard.summary;
  const status           = STATUS_MAP[dashboard.status] ?? STATUS_MAP.watch;
  const planner          = dashboard.budget_planner?.allocations ?? [];
  const accountBreakdown = dashboard.account_breakdown ?? [];
  const recentTx         = dashboard.recent_transactions ?? [];
  const cashflow         = dashboard.cashflow ?? [];
  const dailyTrend       = dashboard.daily_trend ?? [];
  const insights         = dashboard.insights ?? [];
  const actions          = dashboard.actions ?? [];
  const topCategories    = dashboard.top_categories ?? [];
  const periodLabel      = dashboard.period?.label || 'periode aktif';

  const totalFlow    = Number(summary.income_this_month || 0) + Number(summary.expense_this_month || 0);
  const incomeShare  = totalFlow ? Math.round((Number(summary.income_this_month || 0) / totalFlow) * 100) : 0;
  const expenseShare = totalFlow ? 100 - incomeShare : 0;

  return (
    <div className="dashboard-fade-in space-y-5 pb-4 md:pb-8">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="dashboard-card-up grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/8 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">
            <Sparkles size={13} />
            {dashboard.period?.label}
          </span>
          <h1 className="max-w-3xl text-[1.75rem] font-bold leading-tight text-text-title md:text-4xl">
            Hai {dashboard.user?.name || 'Teman WeeB'}, ini pusat kendali uangmu.
          </h1>
        </div>
        <div className={cn('dashboard-card-up rounded-2xl border px-5 py-3.5', status.cls)} style={{ animationDelay: '120ms' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest">{status.label}</p>
          <p className="mt-0.5 text-sm font-semibold">{status.desc}</p>
        </div>
      </section>

      {/* ═══════════════ BALANCE HERO CARD ═══════════════ */}
      <section className="dashboard-card-up" style={{ animationDelay: '80ms' }}>
        <Card className="overflow-hidden border-primary-500/25 bg-gradient-to-br from-primary-500/8 via-transparent to-transparent">
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:gap-8 md:p-7">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/12 text-primary-600">
                  <Wallet size={24} />
                </span>
                <span className="text-sm font-semibold text-text-muted">Total saldo rekening aktif</span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-text-title md:text-5xl">
                {formatCurrency(summary.balance)}
              </p>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Sisa bersih sampai gajian:{' '}
                <span className="font-bold text-primary-600">{formatCurrency(summary.net_until_payday)}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-sm shadow-card-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-text-muted">Aman harian</p>
                  <p className="mt-2 text-2xl font-bold text-primary-600 md:text-3xl">{formatCurrency(summary.daily_safe_amount)}</p>
                </div>
                <CalendarClock className="text-primary-500/60" size={30} />
              </div>
              <div className="mt-4 rounded-xl bg-surface-100 p-3">
                <p className="text-sm leading-5 text-text-muted">
                  <span className="font-semibold text-text-title">{summary.days_to_payday} hari</span> menuju gajian berikutnya
                  {summary.next_payday && <>, estimasi <span className="font-semibold text-text-title">{formatDate(summary.next_payday)}</span></>}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ METRIC ROW ═══════════════ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CashflowCard
          icon={ArrowDownRight}
          label="Pemasukan periode aktif"
          value={formatCurrency(summary.income_this_month)}
          tone="text-success-base"
          badge={`${incomeShare}% arus kas`}
          badgeCls="bg-success-base/12 text-success-base"
          chartData={cashflow}
          dataKey="income"
          gradientId="dashIncGrad"
          stroke="#059669"
          helper={`Akumulasi pemasukan selama ${periodLabel}.`}
          delay={0}
        />
        <CashflowCard
          icon={ArrowUpRight}
          label="Pengeluaran periode aktif"
          value={formatCurrency(summary.expense_this_month)}
          tone="text-danger-base"
          badge={`${expenseShare}% arus kas`}
          badgeCls="bg-danger-base/12 text-danger-base"
          chartData={cashflow}
          dataKey="expense"
          gradientId="dashExpGrad"
          stroke="#DC2626"
          helper={`Akumulasi pengeluaran selama ${periodLabel}.`}
          delay={60}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Sisa bulan ini"
          value={formatCurrency(summary.remaining_this_month)}
          sub="Pemasukan dikurangi pengeluaran."
          tone="text-primary-600"
          delay={120}
        />
      </section>

      {/* ═══════════════ SAVINGS + PLANNER ═══════════════ */}
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="dashboard-card-up" style={{ animationDelay: '40ms' }}>
          <CardHeader>
            <CardTitle>Saldo Khusus</CardTitle>
            <CardDescription>Rekening berdasarkan klasifikasi uang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <ProgressBar
              icon={PiggyBank} label="Tabungan"
              current={dashboard.saving_goal?.current_amount}
              target={dashboard.saving_goal?.target_amount}
              tone="text-primary-600" accentCls="bg-primary-500"
              delay={80}
            />
            <ProgressBar
              icon={ShieldCheck} label="Dana Darurat"
              current={dashboard.emergency_fund?.current_amount}
              target={dashboard.emergency_fund?.target_amount}
              tone="text-success-base" accentCls="bg-success-base"
              delay={140}
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card-up" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Budget Planner</CardTitle>
            <CardDescription>Empat pos utama dari dana dasar bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {planner.map((item, i) => (
              <div
                key={item.key}
                className="dashboard-card-up rounded-2xl border border-border-subtle bg-surface-100/70 p-4 transition-colors hover:bg-surface-200/50"
                style={{ animationDelay: `${100 + i * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-title">{item.label}</p>
                  <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-bold text-primary-600">{item.percent}%</span>
                </div>
                <p className="mt-2.5 text-xl font-bold tabular-nums text-text-title">{formatCurrency(item.amount)}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-300">
                  <div className="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ CASHFLOW CHART + ACTIONS ═══════════════ */}
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="dashboard-card-up" style={{ animationDelay: '40ms' }}>
          <CardHeader>
            <CardTitle>Cashflow Mingguan</CardTitle>
            <CardDescription>Pemasukan vs pengeluaran bulan berjalan.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cfExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={44} fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={weekLabel} contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#cfIncome)" strokeWidth={2.5} name="Pemasukan" animationDuration={1000} />
                <Area type="monotone" dataKey="expense" stroke="#F59E0B" fill="url(#cfExpense)" strokeWidth={2.5} name="Pengeluaran" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dashboard-card-up" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Aksi Terdekat</CardTitle>
            <CardDescription>Prioritas yang paling layak dilakukan hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {actions.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Tidak ada aksi mendesak 🎉</p>
            ) : actions.map((item, i) => (
              <div
                key={item}
                className="dashboard-card-up flex gap-3 rounded-2xl bg-surface-100/70 p-3.5 text-sm leading-5 text-text-body transition-colors hover:bg-surface-200/50"
                style={{ animationDelay: `${120 + i * 40}ms` }}
              >
                <CheckCircle2 className="mt-0.5 shrink-0 text-success-base" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ BOTTOM ROW: TX + CATEGORIES + INSIGHTS ═══════════════ */}
      <section className="grid gap-4 xl:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="dashboard-card-up" style={{ animationDelay: '40ms' }}>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>Aktivitas terakhir dari semua menu transaksi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentTx.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada transaksi</p>
            ) : recentTx.map((item, i) => (
              <TransactionRow key={item.id} item={item} delay={80 + i * 30} />
            ))}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card className="dashboard-card-up" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Kategori Terbesar</CardTitle>
            <CardDescription>Pengeluaran paling dominan bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada pengeluaran</p>
            ) : topCategories.map((cat, i) => (
              <div key={`${cat.category_id}-${cat.name}`} className="dashboard-card-up" style={{ animationDelay: `${120 + i * 40}ms` }}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-text-title">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {cat.name}
                  </span>
                  <span className="tabular-nums text-text-muted">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-200">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(cat.percent, 100)}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="dashboard-card-up" style={{ animationDelay: '120ms' }}>
          <CardHeader>
            <CardTitle>Insight</CardTitle>
            <CardDescription>Catatan singkat dari pola data bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {insights.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada insight</p>
            ) : insights.map((text, i) => (
              <div
                key={text}
                className="dashboard-card-up flex gap-3 rounded-2xl bg-primary-500/6 p-3.5 text-sm leading-6 text-text-body"
                style={{ animationDelay: `${160 + i * 40}ms` }}
              >
                <Lightbulb className="mt-0.5 shrink-0 text-primary-600" size={17} />
                <span>{text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════ ACCOUNT BREAKDOWN + DAILY TREND ═══════════════ */}
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="dashboard-card-up" style={{ animationDelay: '40ms' }}>
          <CardHeader>
            <CardTitle>Komposisi Rekening</CardTitle>
            <CardDescription>Total saldo per klasifikasi uang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {accountBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada rekening aktif</p>
            ) : accountBreakdown.map((item, i) => (
              <div
                key={item.purpose}
                className="dashboard-card-up flex items-center justify-between gap-3 rounded-2xl bg-surface-100/70 p-3.5 transition-colors hover:bg-surface-200/50"
                style={{ animationDelay: `${80 + i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <p className="text-sm font-semibold text-text-title">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.account_count} rekening</p>
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums text-text-title">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="dashboard-card-up" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Ritme Pengeluaran Harian</CardTitle>
            <CardDescription>Tujuh hari terakhir, untuk melihat hari yang terasa bocor.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={44} fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="amount" fill="var(--color-primary-500)" radius={[8, 8, 0, 0]} name="Pengeluaran" animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
