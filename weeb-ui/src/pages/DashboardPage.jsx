import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronRight, Mic, Plus, RefreshCw, Wallet,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/feedback/LoadingSkeleton';
import VoiceTransactionModal from '../components/VoiceTransactionModal';
import { useDashboard } from '../hooks/useDashboard';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useRangeReport } from '../hooks/useRangeReport';
import BalanceChartCard, { BalanceChartCardSkeleton, Delta } from '../features/dashboard/BalanceChartCard';
import { buildPoints, RANGE_DAYS, resolveRange, shortDate } from '../features/dashboard/chartData';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate } from '../lib/formatters';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const STATUS = {
  safe: { label: 'Aman', cls: 'bg-success-soft text-success-base' },
  watch: { label: 'Waspada', cls: 'bg-warning-soft text-warning-base' },
  tight: { label: 'Ketat', cls: 'bg-warning-soft text-warning-base' },
  danger: { label: 'Darurat', cls: 'bg-danger-soft text-danger-base' },
};

const HEALTH_LABELS = {
  aman: 'Aman',
  cukup_sehat: 'Cukup sehat',
  waspada: 'Waspada',
  perlu_diketatkan: 'Perlu diketatkan',
};

const BILL_DOT = { urgent: 'bg-danger-base', watch: 'bg-warning-base', safe: 'bg-success-base' };

// Same widths the real rows end up with, so the skeleton does not shift when data lands.
const ACCOUNT_GRID = 'grid items-center gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]';
const COLUMN_GRID = 'grid items-start gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_340px]';
/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
function Panel({ title, action, children, className }) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="font-outfit text-base font-semibold text-text-title">{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>
    </Card>
  );
}

function PanelLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-medium text-primary-600 hover:underline">
      {children}
      <ChevronRight size={16} />
    </Link>
  );
}

function ProgressBar({ percent, tone = 'bg-primary-500' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-200">
      <div className={cn('grow-x h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(Number(percent) || 0, 100))}%` }} />
    </div>
  );
}

function EmptyLine({ children }) {
  return <p className="py-3 text-sm text-text-muted">{children}</p>;
}

/* ------------------------------------------------------------------ */
/*  Skeleton / Error / Empty                                           */
/* ------------------------------------------------------------------ */
function PanelSkeleton({ titleWidth = 'w-28', action = false, children }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <Skeleton className={cn('h-5', titleWidth)} />
        {action && <Skeleton className="h-4 w-20" />}
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>
    </Card>
  );
}

/** Mirrors the loaded dashboard block for block: hero + chart + stat strip, then both columns. */
function DashboardSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4" aria-busy="true" aria-label="Memuat dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-32" />
        <div className="hidden gap-2 md:flex">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <div className={COLUMN_GRID}>
        <div className="space-y-3 md:space-y-4">
          <BalanceChartCardSkeleton />

          <PanelSkeleton titleWidth="w-24" action>
            <div className={cn(ACCOUNT_GRID, 'hidden border-b border-border-subtle pb-2 md:grid')}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-10" />
              <Skeleton className="ml-auto h-3 w-10" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
            <div className="divide-y divide-border-subtle">
              {['w-28', 'w-36', 'w-24', 'w-32', 'w-40'].map((width, index) => (
                <div key={index} className={cn(ACCOUNT_GRID, 'grid-cols-[minmax(0,1fr)_auto] py-3')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <Skeleton className={cn('h-3.5', width)} />
                      <Skeleton className="mt-2 h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="ml-auto hidden h-3.5 w-20 md:block" />
                  <Skeleton className="ml-auto hidden h-3.5 w-20 md:block" />
                  <div>
                    <Skeleton className="ml-auto h-4 w-24" />
                    <Skeleton className="ml-auto mt-2 h-4 w-20 rounded-md md:hidden" />
                  </div>
                </div>
              ))}
            </div>
          </PanelSkeleton>

          <PanelSkeleton titleWidth="w-36" action>
            <div className="divide-y divide-border-subtle">
              {['w-40', 'w-32', 'w-44', 'w-28', 'w-36', 'w-32'].map((width, index) => (
                <div key={index} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className={cn('h-3.5 max-w-full', width)} />
                    <Skeleton className="mt-2 h-3 w-44 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-24 shrink-0" />
                </div>
              ))}
            </div>
          </PanelSkeleton>
        </div>

        <div className="space-y-3 md:space-y-4">
          <PanelSkeleton titleWidth="w-40">
            <div className="flex items-end justify-between gap-3 pt-1">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            <div className="mt-4 space-y-2.5">
              {[0, 1].map((index) => (
                <div key={index} className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          </PanelSkeleton>

          <PanelSkeleton titleWidth="w-44">
            <div className="space-y-3.5 pt-1">
              {['w-16', 'w-24', 'w-20', 'w-28', 'w-16'].map((width, index) => (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className={cn('h-3.5', width)} />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </PanelSkeleton>

          <PanelSkeleton titleWidth="w-32" action>
            <div className="divide-y divide-border-subtle">
              {['w-32', 'w-40', 'w-28', 'w-36'].map((width, index) => (
                <div key={index} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className={cn('h-3.5', width)} />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </PanelSkeleton>

          <PanelSkeleton titleWidth="w-16">
            <div className="space-y-4 pt-1">
              {[0, 1].map((index) => (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-10" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
              ))}
            </div>
          </PanelSkeleton>
        </div>
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }) {
  return (
    <Card className="border-danger-line">
      <div className="flex min-h-[260px] flex-col items-center justify-center p-5 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft">
          <AlertTriangle className="text-danger-base" size={24} />
        </span>
        <h1 className="text-lg font-semibold text-text-title">Dashboard belum bisa dimuat</h1>
        <p className="mt-1 max-w-md text-sm leading-6 text-text-muted">{message}</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Coba lagi
        </Button>
      </div>
    </Card>
  );
}

function EmptyDashboard({ onAddManual, onAddVoice }) {
  return (
    <div className="space-y-3 md:space-y-4">
      <h1 className="text-xl font-semibold text-text-title md:text-2xl">Dashboard</h1>
      <Card>
        <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-600">
            <Wallet size={24} />
          </span>
          <p className="text-lg font-semibold text-text-title">Belum ada data keuangan</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-text-muted">
            Catat transaksi pertama secara manual atau lewat suara.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={onAddManual}>
              <Plus size={16} className="mr-2" />
              Tambah transaksi
            </Button>
            <Button variant="accent" onClick={onAddVoice}>
              <Mic size={16} className="mr-2" />
              Catat via suara
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [rangeKey, setRangeKey] = useState('payday');
  const { dashboard, isLoading, error, refetch } = useDashboard();

  const paydayDay = user?.profile?.payday_day;
  const { start, end } = useMemo(() => resolveRange(rangeKey, paydayDay), [rangeKey, paydayDay]);

  // The headline is the everyday-spending pocket. Without any such account it falls back to
  // everything the user holds, so a fresh setup still gets a meaningful number and chart.
  const needPocket = dashboard?.focused_balances?.find((item) => item.key === 'need');
  const scope = needPocket?.account_count > 0 ? 'need' : 'all';
  // Held until the dashboard has answered: the scope is not known before that.
  const report = useRangeReport(dashboard ? start : null, end, scope);

  const pocketBalance = Number(report.flow?.balance ?? (scope === 'need' ? needPocket?.total : dashboard?.summary?.balance) ?? 0);
  const chart = useMemo(() => buildPoints(report.flow?.series || [], pocketBalance), [report.flow, pocketBalance]);

  const categories = useMemo(() => {
    const rows = (report.breakdown || []).map((item) => ({ ...item, total: Number(item.total || 0) }));
    const total = rows.reduce((sum, item) => sum + item.total, 0);

    return {
      total,
      rows: rows.slice(0, 6).map((item) => ({ ...item, percent: total > 0 ? (item.total / total) * 100 : 0 })),
    };
  }, [report.breakdown]);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} onRetry={refetch} />;

  const handleAddManual = () => navigate('/transactions', { state: { openCreate: true } });
  const handleAddVoice = () => setVoiceModalOpen(true);
  const voiceModal = <VoiceTransactionModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />;

  if (!dashboard || dashboard.is_empty) {
    return (
      <>
        <EmptyDashboard onAddManual={handleAddManual} onAddVoice={handleAddVoice} />
        {voiceModal}
      </>
    );
  }

  const summary = dashboard.summary;
  const status = STATUS[dashboard.status] ?? STATUS.watch;
  const accounts = dashboard.account_balances ?? [];
  const transactions = dashboard.recent_transactions ?? [];
  const bills = dashboard.upcoming_bills ?? [];
  const budgetWarnings = dashboard.budget_warnings ?? [];
  const needTypes = dashboard.expense_by_need_type ?? [];
  const goals = [dashboard.saving_goal, dashboard.emergency_fund].filter(Boolean);
  const health = dashboard.health_score;
  const healthScore = Number(health?.score || 0);
  const healthTone = healthScore >= 80 ? 'success' : healthScore >= 60 ? 'primary' : healthScore >= 40 ? 'warning' : 'danger';
  const healthClasses = {
    success: ['bg-success-base', 'bg-success-soft text-success-base'],
    primary: ['bg-primary-500', 'bg-primary-soft text-primary-600'],
    warning: ['bg-warning-base', 'bg-warning-soft text-warning-base'],
    danger: ['bg-danger-base', 'bg-danger-soft text-danger-base'],
  }[healthTone];

  const daysToPayday = Math.max(1, Math.round(Number(summary.days_to_payday) || 1));
  const isNeedScope = scope === 'need';
  // What is left in the pocket, spread over the days until the next payday.
  const dailySafeAmount = isNeedScope ? Math.floor(Math.max(pocketBalance, 0) / daysToPayday) : summary.daily_safe_amount;
  const rangeCaption = rangeKey === 'payday' ? `sejak gajian ${shortDate(start)}` : `${RANGE_DAYS[rangeKey]} hari terakhir`;

  const stats = [
    { label: 'Pemasukan', value: formatCurrency(chart.income), tone: 'text-success-base', hint: isNeedScope ? 'masuk ke rekening kebutuhan' : rangeCaption, isLoading: report.isLoading },
    { label: 'Pengeluaran', value: formatCurrency(chart.expense), tone: 'text-danger-base', hint: isNeedScope ? 'dari rekening kebutuhan' : rangeCaption, isLoading: report.isLoading },
    { label: 'Aman harian', value: formatCurrency(dailySafeAmount), tone: 'text-text-title', hint: isNeedScope ? 'dari sisa saldo kebutuhan' : 'sampai gajian berikutnya' },
    { label: 'Gajian berikutnya', value: `${daysToPayday} hari`, tone: 'text-text-title', hint: summary.next_payday ? formatDate(summary.next_payday) : '-' },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-title md:text-2xl">Dashboard</h1>
        {/* On mobile the bottom bar's + button already carries both actions. */}
        <div className="hidden gap-2 md:flex">
          <Button onClick={handleAddManual}>
            <Plus size={16} className="mr-2" />
            Tambah transaksi
          </Button>
          <Button variant="accent" onClick={handleAddVoice}>
            <Mic size={16} className="mr-2" />
            Catat via suara
          </Button>
        </div>
      </header>

      <div className={COLUMN_GRID}>
        {/* ---------------- Main column ---------------- */}
        <div className="stagger min-w-0 space-y-3 md:space-y-4">
          <BalanceChartCard
            title={isNeedScope ? 'Sisa saldo kebutuhan' : 'Total saldo'}
            status={status}
            balance={pocketBalance}
            chart={chart}
            rangeKey={rangeKey}
            onRangeChange={setRangeKey}
            rangeCaption={rangeCaption}
            stats={stats}
            isLoading={report.isLoading}
            isRefreshing={report.isRefreshing}
            error={report.error}
          />

          <Panel title="Rekening" action={<PanelLink to="/accounts">Kelola</PanelLink>}>
            {accounts.length === 0 ? <EmptyLine>Belum ada rekening aktif.</EmptyLine> : (
              <>
                <div className={cn(ACCOUNT_GRID, 'hidden border-b border-border-subtle pb-2 text-xs text-text-muted md:grid')}>
                  <span>{dashboard.period?.label}</span>
                  <span className="text-right">Masuk</span>
                  <span className="text-right">Keluar</span>
                  <span className="text-right">Saldo</span>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {accounts.map((account) => (
                    <li key={account.id} className={cn(ACCOUNT_GRID, 'grid-cols-[minmax(0,1fr)_auto] py-3')}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-semibold text-primary-600">
                          {account.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-title">{account.name}</p>
                          <p className="truncate text-xs text-text-muted">{account.purpose_label}</p>
                        </div>
                      </div>
                      <span className="hidden text-right text-sm tabular-nums text-success-base md:block">
                        {Number(account.income) > 0 ? `+${formatCurrency(account.income)}` : '-'}
                      </span>
                      <span className="hidden text-right text-sm tabular-nums text-danger-base md:block">
                        {Number(account.expense) > 0 ? `-${formatCurrency(account.expense)}` : '-'}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-text-title">{formatCurrency(account.balance)}</p>
                        <Delta value={account.net} className="mt-1 md:hidden" />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Transaksi terakhir" action={<PanelLink to="/transactions">Lihat semua</PanelLink>}>
            {transactions.length === 0 ? <EmptyLine>Belum ada transaksi.</EmptyLine> : (
              <ul className="divide-y divide-border-subtle">
                {transactions.map((transaction) => {
                  const isIncome = transaction.transaction_type === 'income';

                  return (
                    <li key={transaction.id} className="flex items-center gap-3 py-3">
                      <span className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        isIncome ? 'bg-success-soft text-success-base' : 'bg-danger-soft text-danger-base',
                      )}>
                        {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-title">{transaction.description}</p>
                        <p className="truncate text-xs text-text-muted">
                          {[formatDate(transaction.transaction_date), transaction.category_name, transaction.account_name].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', isIncome ? 'text-success-base' : 'text-danger-base')}>
                        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------------- Side column ---------------- */}
        <div className="stagger min-w-0 space-y-3 md:space-y-4">
          <Panel title="Kesehatan keuangan" action={<PanelLink to="/insights">Insight</PanelLink>}>
            <div className="flex items-end justify-between gap-3 pt-1">
              <p className="font-outfit text-4xl font-semibold tabular-nums text-text-title">
                {healthScore}<span className="text-base font-medium text-text-muted">/100</span>
              </p>
              <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', healthClasses[1])}>
                {HEALTH_LABELS[health?.label] || health?.label}
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar percent={healthScore} tone={healthClasses[0]} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {needTypes.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">{item.label} bulan ini</dt>
                  <dd className="font-semibold tabular-nums text-text-title">{formatCurrency(item.amount)}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Pengeluaran per kategori"
            action={!report.isLoading && <span className="text-sm font-semibold tabular-nums text-text-title">{formatCurrency(categories.total)}</span>}
          >
            {report.isLoading ? (
              <div className="space-y-3.5 pt-1">
                {['w-16', 'w-24', 'w-20', 'w-28', 'w-16'].map((width, index) => (
                  <div key={index}>
                    <div className="mb-2 flex items-center justify-between">
                      <Skeleton className={cn('h-3.5', width)} />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : categories.rows.length === 0 ? <EmptyLine>Belum ada pengeluaran {rangeCaption}.</EmptyLine> : (
              <ul className={cn('space-y-3 pt-1 transition-opacity duration-200', report.isRefreshing && 'opacity-50')}>
                {categories.rows.map((category) => (
                  <li key={category.category_id ?? category.category_name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-text-body">{category.category_name}</span>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        <span className="font-semibold text-text-title">{formatCurrency(category.total)}</span>
                        {' '}· {Math.round(category.percent)}%
                      </span>
                    </div>
                    <ProgressBar percent={category.percent} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Tagihan terdekat" action={<PanelLink to="/bills">Semua</PanelLink>}>
            {bills.length === 0 ? <EmptyLine>Tidak ada tagihan aktif.</EmptyLine> : (
              <ul className="divide-y divide-border-subtle">
                {bills.map((bill) => (
                  <li key={bill.id} className="flex items-center gap-3 py-2.5">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', BILL_DOT[bill.status] || BILL_DOT.safe)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-title">{bill.name}</p>
                      <p className="truncate text-xs text-text-muted">{formatDate(bill.due_date)} · {bill.due_label}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-text-title">{formatCurrency(bill.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {goals.length > 0 && (
            <Panel title="Target">
              <ul className="space-y-4 pt-1">
                {goals.map((goal) => (
                  <li key={goal.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-body">{goal.name}</span>
                      <span className="font-semibold tabular-nums text-text-title">{Math.round(Number(goal.progress_percent) || 0)}%</span>
                    </div>
                    <ProgressBar percent={goal.progress_percent} tone="bg-success-base" />
                    <p className="mt-1.5 text-xs tabular-nums text-text-muted">
                      {formatCurrency(goal.current_amount)} dari {formatCurrency(goal.target_amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {budgetWarnings.length > 0 && (
            <Panel title="Budget hampir habis">
              <ul className="space-y-3 pt-1">
                {budgetWarnings.map((warning) => (
                  <li key={warning.category_id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-text-body">{warning.category_name}</span>
                      <span className={cn('shrink-0 font-semibold tabular-nums', warning.status === 'exceeded' ? 'text-danger-base' : 'text-warning-base')}>
                        {Math.round(warning.usage_percent)}%
                      </span>
                    </div>
                    <ProgressBar percent={warning.usage_percent} tone={warning.status === 'exceeded' ? 'bg-danger-base' : 'bg-warning-base'} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {voiceModal}
    </div>
  );
}
