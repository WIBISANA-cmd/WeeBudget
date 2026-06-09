import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, CreditCard, Lightbulb, PiggyBank, RefreshCw, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/utils';
import { compactCurrency, formatCurrency, formatDate } from '../lib/formatters';

const colors = ['rgb(15,60,113)', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#22C55E'];

const statusCopy = {
  safe: ['Aman', 'Ritme bulan ini masih sehat', 'border-success-base/20 bg-success-base/10 text-success-base'],
  watch: ['Waspada', 'Masih aman, tapi perlu dijaga', 'border-warning-base/20 bg-warning-base/10 text-warning-base'],
  tight: ['Ketat', 'Utamakan kebutuhan wajib', 'border-warning-base/20 bg-warning-base/10 text-warning-base'],
  danger: ['Darurat', 'Tahan pengeluaran fleksibel dulu', 'border-danger-base/20 bg-danger-base/10 text-danger-base'],
};

function LoadingDashboard() {
  return (
    <div className="space-y-5">
      <div className="h-40 animate-pulse rounded-2xl bg-surface-100" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-surface-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-surface-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-surface-100" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-surface-100" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Card className="border-danger-base">
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 text-danger-base" size={28} />
        <h1 className="text-xl font-semibold text-text-title">Dashboard belum bisa dimuat</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{message}</p>
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white">
          <RefreshCw size={16} />
          Coba lagi
        </button>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary-500/20 bg-primary-500/5 p-5 text-center">
      <Sparkles className="mb-3 text-primary-600" size={24} />
      <p className="font-semibold text-text-title">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">{description}</p>
    </div>
  );
}

function formatWeekLabel(value) {
  const week = String(value || '').replace(/^M/i, '');

  return week ? `Minggu ${week}` : '-';
}

function Metric({ icon: Icon, label, value, helper, tone }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4 md:gap-4 md:p-6">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-100', tone)}>
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-text-muted">{label}</p>
          <p className="mt-1.5 break-words text-xl font-semibold text-text-title md:mt-2 md:text-2xl">{value}</p>
          <p className="mt-1 text-sm leading-5 text-text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CashflowMetricCard({ icon: Icon, label, value, helper, tone, chartData, dataKey, gradientId, stroke, fill, shareLabel }) {
  const peak = chartData.reduce((highest, item) => (
    Number(item[dataKey] || 0) > Number(highest[dataKey] || 0) ? item : highest
  ), chartData[0] ?? {});

  return (
    <Card>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100', tone)}>
              <Icon size={21} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-text-muted">{label}</p>
              <p className="mt-1.5 break-words text-xl font-semibold text-text-title md:mt-2 md:text-2xl">{value}</p>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', fill)}>
            {shareLabel}
          </span>
        </div>

        <div className="h-[96px] rounded-2xl bg-surface-100 p-2">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs font-medium text-text-muted">Belum ada ritme mingguan</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stroke} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={stroke} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" hide />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip
                  formatter={(tooltipValue) => formatCurrency(tooltipValue)}
                  labelFormatter={formatWeekLabel}
                  contentStyle={{
                    borderRadius: 14,
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-surface-panel)',
                    color: 'var(--color-text-body)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                />
                <Area type="monotone" dataKey={dataKey} stroke={stroke} fill={`url(#${gradientId})`} strokeWidth={3} dot={false} activeDot={{ r: 4 }} name={label} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-surface-100 p-3">
            <p className="text-text-muted">Puncak minggu</p>
            <p className="mt-1 truncate font-semibold text-text-title">{formatWeekLabel(peak.week)}</p>
          </div>
          <div className="rounded-2xl bg-surface-100 p-3">
            <p className="text-text-muted">Nominal puncak</p>
            <p className="mt-1 truncate font-semibold text-text-title">{formatCurrency(peak[dataKey])}</p>
          </div>
        </div>

        <p className="text-sm leading-5 text-text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ icon: Icon, title, current, target, tone }) {
  const percent = Math.min(Math.round((Number(current || 0) / Math.max(Number(target || 1), 1)) * 100), 100);

  return (
    <div className="rounded-[24px] border border-border-subtle bg-surface-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-100', tone)}>
            <Icon size={20} />
          </span>
          <div>
            <p className="font-semibold text-text-title">{title}</p>
            <p className="text-sm text-text-muted">{formatCurrency(current)}</p>
          </div>
        </div>
        <span className={cn('text-sm font-semibold', tone)}>{percent}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-300">
        <div className={cn('h-full rounded-full', tone.includes('success') ? 'bg-success-base' : 'bg-primary-500')} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-xs text-text-muted">Acuan planner bulan ini: {formatCurrency(target)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { dashboard, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <LoadingDashboard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!dashboard || dashboard.is_empty) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-text-title md:text-3xl">Dashboard WeeB</h1>
          <p className="mt-2 text-text-muted">Buat rekening atau catat transaksi pertama agar dashboard mulai membaca pola uangmu.</p>
        </header>
        <EmptyPanel title="Belum ada data keuangan" description="Mulai dari menu Rekening, lalu catat pemasukan atau setoran tabungan pertama." />
      </div>
    );
  }

  const summary = dashboard.summary;
  const status = statusCopy[dashboard.status] ?? statusCopy.watch;
  const planner = dashboard.budget_planner?.allocations ?? [];
  const accountBreakdown = dashboard.account_breakdown ?? [];
  const recentTransactions = dashboard.recent_transactions ?? [];
  const cashflow = dashboard.cashflow ?? [];
  const dailyTrend = dashboard.daily_trend ?? [];
  const insights = dashboard.insights ?? [];
  const actions = dashboard.actions ?? [];
  const topCategories = dashboard.top_categories ?? [];
  const totalPeriodFlow = Number(summary.income_this_month || 0) + Number(summary.expense_this_month || 0);
  const incomeShare = totalPeriodFlow ? Math.round((Number(summary.income_this_month || 0) / totalPeriodFlow) * 100) : 0;
  const expenseShare = totalPeriodFlow ? Math.round((Number(summary.expense_this_month || 0) / totalPeriodFlow) * 100) : 0;
  const periodLabel = dashboard.period?.label || 'periode aktif';

  return (
    <div className="space-y-5 pb-4 md:pb-8">
      <header className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600">
            <Sparkles size={14} />
            {dashboard.period?.label}
          </div>
          <h1 className="max-w-3xl text-[1.9rem] font-bold leading-tight text-text-title md:text-4xl">
            Hai {dashboard.user?.name || 'Teman WeeB'}, ini pusat kendali uangmu.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
            Dashboard ini menarik data dari rekening, transaksi, tabungan, dana darurat, tagihan, dan budget planner.
          </p>
        </div>
        <div className={cn('rounded-[24px] border px-5 py-4', status[2])}>
          <p className="text-xs font-semibold uppercase tracking-wide">{status[0]}</p>
          <p className="mt-1 font-semibold">{status[1]}</p>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-primary-500 bg-[linear-gradient(180deg,rgba(15,60,113,0.08),rgba(255,255,255,0.9))]">
          <CardContent className="grid gap-5 p-4 md:grid-cols-[1fr_0.8fr] md:gap-6 md:p-7">
            <div>
              <div className="flex items-center gap-3 text-text-muted">
                <span className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary-500/10 text-primary-600">
                  <Wallet size={24} />
                </span>
                <span className="font-semibold">Total saldo rekening aktif</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-text-title md:mt-5 md:text-5xl">{formatCurrency(summary.balance)}</p>
              <p className="mt-4 text-sm leading-6 text-text-muted">
                Sisa bersih sampai gajian: <span className="font-semibold text-primary-600">{formatCurrency(summary.net_until_payday)}</span>.
              </p>
            </div>
            <div className="rounded-[24px] border border-border-subtle bg-surface-panel/85 p-4 shadow-sm shadow-card-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-text-muted">Aman harian</p>
                  <p className="mt-2 text-2xl font-semibold text-primary-600 md:text-3xl">{formatCurrency(summary.daily_safe_amount)}</p>
                </div>
                <CalendarClock className="text-primary-600" size={32} />
              </div>
              <p className="mt-5 rounded-2xl bg-surface-100 p-3 text-sm leading-6 text-text-muted">
                {summary.days_to_payday} hari menuju gajian berikutnya, estimasi {formatDate(summary.next_payday)}.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aksi Terdekat</CardTitle>
            <CardDescription>Prioritas yang paling layak dilakukan hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-surface-200 p-3 text-sm leading-5 text-text-body">
                <CheckCircle2 className="mt-0.5 shrink-0 text-success-base" size={18} />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CashflowMetricCard
          icon={ArrowDownRight}
          label="Pemasukan periode aktif"
          value={formatCurrency(summary.income_this_month)}
          helper={`Akumulasi pemasukan selama ${periodLabel}, termasuk setoran tabungan.`}
          tone="text-success-base"
          chartData={cashflow}
          dataKey="income"
          gradientId="incomeMetricTrend"
          stroke="#059669"
          fill="bg-success-base text-white"
          shareLabel={`${incomeShare}% arus kas`}
        />
        <CashflowMetricCard
          icon={ArrowUpRight}
          label="Pengeluaran periode aktif"
          value={formatCurrency(summary.expense_this_month)}
          helper={`Akumulasi pengeluaran berdasarkan transaksi selama ${periodLabel}.`}
          tone="text-danger-base"
          chartData={cashflow}
          dataKey="expense"
          gradientId="expenseMetricTrend"
          stroke="#DC2626"
          fill="bg-danger-base text-white"
          shareLabel={`${expenseShare}% arus kas`}
        />
        <Metric icon={CircleDollarSign} label="Sisa bulan ini" value={formatCurrency(summary.remaining_this_month)} helper="Pemasukan dikurangi pengeluaran." tone="text-primary-600" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Saldo Khusus</CardTitle>
            <CardDescription>Mengikuti rekening dengan klasifikasi uang yang sesuai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressCard icon={PiggyBank} title="Tabungan" current={dashboard.saving_goal?.current_amount} target={dashboard.saving_goal?.target_amount} tone="text-primary-600" />
            <ProgressCard icon={ShieldCheck} title="Dana Darurat" current={dashboard.emergency_fund?.current_amount} target={dashboard.emergency_fund?.target_amount} tone="text-success-base" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Planner</CardTitle>
            <CardDescription>Empat pos utama dari dana dasar bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {planner.map((item) => (
              <div key={item.key} className="rounded-[24px] border border-border-subtle bg-surface-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-title">{item.label}</p>
                  <span className="rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-600">{item.percent}%</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-text-title">{formatCurrency(item.amount)}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-300">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cashflow Mingguan</CardTitle>
            <CardDescription>Pemasukan dan pengeluaran bulan berjalan.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} /></linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={42} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 14, border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-surface-panel)', color: 'var(--color-text-body)' }} />
                <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#income)" strokeWidth={2} name="Pemasukan" />
                <Area type="monotone" dataKey="expense" stroke="#F59E0B" fill="url(#expense)" strokeWidth={2} name="Pengeluaran" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Komposisi Rekening</CardTitle>
            <CardDescription>Total saldo per klasifikasi uang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountBreakdown.length === 0 ? <EmptyPanel title="Belum ada rekening aktif" description="Tambahkan rekening untuk melihat komposisi saldo." /> : accountBreakdown.map((item, index) => (
              <div key={item.purpose} className="rounded-2xl bg-surface-200 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-text-title"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />{item.label}</span>
                  <span className="text-text-muted">{formatCurrency(item.total)}</span>
                </div>
                <p className="text-xs text-text-muted">{item.account_count} rekening aktif</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>Aktivitas terakhir dari semua menu transaksi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-200 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.transaction_type === 'income' ? 'bg-success-base/10 text-success-base' : 'bg-danger-base/10 text-danger-base')}>
                    <CreditCard size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-title">{item.description}</p>
                    <p className="text-xs text-text-muted">{formatDate(item.transaction_date)} · {item.account_name || '-'}</p>
                  </div>
                </div>
                <p className={cn('shrink-0 text-sm font-semibold', item.transaction_type === 'income' ? 'text-success-base' : 'text-danger-base')}>
                  {item.transaction_type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kategori Terbesar</CardTitle>
            <CardDescription>Pengeluaran paling dominan bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCategories.length === 0 ? <EmptyPanel title="Belum ada pengeluaran" description="Catat pengeluaran agar kategori terbesar muncul." /> : topCategories.map((category) => (
              <div key={`${category.category_id}-${category.name}`}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-text-title">{category.name}</span>
                  <span className="text-text-muted">{formatCurrency(category.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-300">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(category.percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insight</CardTitle>
            <CardDescription>Catatan singkat dari pola data bulan ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => (
              <div key={insight} className="flex gap-3 rounded-2xl bg-primary-500/10 p-4 text-sm leading-6 text-text-body">
                <Lightbulb className="mt-0.5 shrink-0 text-primary-600" size={18} />
                <span>{insight}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ritme Pengeluaran Harian</CardTitle>
          <CardDescription>Tujuh hari terakhir, untuk melihat hari yang terasa bocor.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="day" stroke="#6B7280" tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" tickLine={false} axisLine={false} tickFormatter={compactCurrency} width={42} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 14, border: '1px solid #E5E7EB' }} />
              <Bar dataKey="amount" fill="rgb(15,60,113)" radius={[8, 8, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
