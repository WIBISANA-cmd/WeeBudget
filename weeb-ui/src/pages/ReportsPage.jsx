import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Shimmer } from '../components/feedback/LoadingSkeleton';
import ErrorState from '../components/feedback/ErrorState';
import EmptyState from '../components/feedback/EmptyState';
import { cachedGet } from '../api/http';
import { formatCurrency, formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';

const CATEGORY_COLORS = ['#3C83F6', '#FBBF24', '#34D399', '#6366f1', '#FDE68A', '#6EE7B7', '#F87171', '#A78BFA'];

const RANGE_DAYS = 30;

// Stable identity so the memos below don't recompute on every render before the first load.
const EMPTY = [];

const dateInputClass = 'w-full rounded-xl border border-border-subtle bg-surface-panel px-3 py-2.5 text-sm text-text-title shadow-sm shadow-card-soft focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/** Local YYYY-MM-DD — toISOString() would shift the day for timezones behind UTC. */
function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Default range: the last RANGE_DAYS days, today included. */
function defaultRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (RANGE_DAYS - 1));

  return { start: toInputDate(start), end: toInputDate(today) };
}

// Charts live inside the page, so tooltip and axes read the theme tokens instead of fixed colors.
const tooltipStyle = {
  background: 'var(--color-surface-panel)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 14,
  color: 'var(--color-text-body)',
  boxShadow: 'var(--shadow-card)',
};

/** Parsed by hand: new Date('YYYY-MM-DD') is UTC and can land on the previous day. */
function asDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day || 1);
}

/** '2026-09-01' → 'September 2026'. */
function monthLabel(month, { short = false } = {}) {
  return asDate(month).toLocaleDateString('id-ID', {
    month: short ? 'short' : 'long',
    year: short ? '2-digit' : 'numeric',
  });
}

/** Axis/tooltip label for one bucket, matching the granularity the server grouped by. */
function periodLabel(period, granularity, { short = false } = {}) {
  if (granularity !== 'day') return monthLabel(period, { short });

  return asDate(period).toLocaleDateString('id-ID', short
    ? { day: 'numeric', month: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Day buckets stay truthful on a short range; a month bucket there would only hold part of its month. */
const DAY_GROUP_LIMIT = 62;

function groupFor(start, end) {
  const days = Math.round((asDate(end) - asDate(start)) / 86_400_000) + 1;
  return days <= DAY_GROUP_LIMIT ? 'day' : 'month';
}

/** '2026-01-01' + '2026-09-12' → '1 Jan 2026 – 12 Sep 2026'. */
function rangeLabel(start, end) {
  if (!start || !end) return 'Semua tanggal';

  const asText = (value) => asDate(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return `${asText(start)} – ${asText(end)}`;
}

/** A slice with no category is the 'Tanpa kategori' bucket; it has no id to key on. */
const categoryKey = (item) => item.category_id ?? 'none';

function compactAmount(value) {
  const amount = Math.abs(Number(value) || 0);
  if (amount >= 1_000_000) return `${Math.round(amount / 100_000) / 10} jt`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} rb`;
  return String(amount);
}

export default function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [details, setDetails] = useState({});

  const { start, end } = range;

  useEffect(() => {
    if (!start || !end) return undefined;

    // A native date input fires a change per segment, so picking month then year used to mean
    // three round trips and three blank pages. Wait for the picking to settle, then fetch once.
    const timer = setTimeout(async () => {
      setRefreshing(true);
      setError(null);
      try {
        // Both endpoints read the same range, so the bars and the pie always add up.
        const [monthly, category] = await Promise.all([
          cachedGet('/reports/monthly', { start, end, group: groupFor(start, end) }),
          cachedGet('/reports/category-breakdown', { start, end }),
        ]);
        setData({ months: monthly.data || [], breakdown: category.data || [] });
      } catch (err) {
        setError(err.response?.data?.message || 'Laporan belum bisa dimuat.');
      } finally {
        setRefreshing(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [start, end]);

  const months = data?.months ?? EMPTY;
  const breakdown = data?.breakdown ?? EMPTY;
  // Only the very first load has nothing to show; later ranges keep the old numbers on screen.
  const isFirstLoad = data === null && !error;

  // Cards show the whole range, so they are the sum of the months the chart draws.
  const totals = useMemo(() => months.reduce((sum, month) => ({
    total_income: sum.total_income + Number(month.total_income || 0),
    total_expense: sum.total_expense + Number(month.total_expense || 0),
    total_saving: sum.total_saving + Number(month.total_saving || 0),
    remaining_amount: sum.remaining_amount + Number(month.remaining_amount || 0),
  }), { total_income: 0, total_expense: 0, total_saving: 0, remaining_amount: 0 }), [months]);

  const granularity = months[0]?.granularity || 'month';
  const trend = useMemo(
    () => months.map((period) => ({
      ...period,
      label: periodLabel(period.period, period.granularity, { short: true }),
    })),
    [months],
  );

  const breakdownTotal = useMemo(
    () => breakdown.reduce((total, item) => total + Number(item.total || 0), 0),
    [breakdown],
  );

  const toggleCategory = async (item) => {
    const key = categoryKey(item);
    if (openCategory === key) {
      setOpenCategory(null);
      return;
    }

    setOpenCategory(key);
    if (details[key]) return;

    try {
      // Same endpoint family and range as the pie, so these rows add up to the slice above them.
      const response = await cachedGet('/reports/category-breakdown/transactions', {
        start,
        end,
        ...(item.category_id ? { category_id: item.category_id } : {}),
      });
      setDetails((current) => ({ ...current, [key]: response.data || [] }));
    } catch {
      setDetails((current) => ({ ...current, [key]: [] }));
    }
  };

  // Refreshing dims the cards in place instead of swapping the page for a skeleton.
  const refreshing = cn('transition-opacity duration-200', isRefreshing && 'opacity-50');

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-title">Laporan</h1>
          
        </div>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:flex-none">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted" htmlFor="report-date-from">Dari tanggal</label>
            <input
              id="report-date-from"
              type="date"
              value={start}
              max={end || undefined}
              onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))}
              className={dateInputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted" htmlFor="report-date-to">Sampai tanggal</label>
            <input
              id="report-date-to"
              type="date"
              value={end}
              min={start || undefined}
              onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))}
              className={dateInputClass}
            />
          </div>
        </div>
      </header>

      {error && <ErrorState message={error} />}

      <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', refreshing)}>
        {[
          ['Pemasukan', totals.total_income, 'text-success-base'],
          ['Pengeluaran', totals.total_expense, 'text-danger-base'],
          ['Tabungan', totals.total_saving, 'text-primary-600'],
          ['Sisa', totals.remaining_amount, totals.remaining_amount < 0 ? 'text-danger-base' : 'text-text-title'],
        ].map(([label, value, tone]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm text-text-muted">{label}</p>
              {isFirstLoad
                ? <Shimmer className="mt-2 h-8 w-32" />
                : <p className={`mt-2 text-2xl font-semibold ${tone}`}>{formatCurrency(value || 0)}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{granularity === 'day' ? 'Tren Harian' : 'Tren per Bulan'}</CardTitle>
          
        </CardHeader>
        <CardContent className={refreshing}>
          {isFirstLoad ? <Shimmer className="h-80" /> : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tickFormatter={compactAmount} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--color-hover-soft)' }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? periodLabel(row.period, row.granularity) : label;
                  }}
                  formatter={(value, name) => [formatCurrency(value), name]}
                />
                <Bar dataKey="total_income" name="Pemasukan" fill="#34D399" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="total_expense" name="Pengeluaran" fill="#F87171" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="cumulative_amount" name="Saldo berjalan" stroke="#3C83F6" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
            {[['Pemasukan', '#34D399'], ['Pengeluaran', '#F87171'], ['Saldo berjalan (akumulatif)', '#3C83F6']].map(([label, color]) => (
              <span key={label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown Kategori</CardTitle>
          <CardDescription>Pengeluaran per kategori pada {rangeLabel(start, end)}.</CardDescription>
        </CardHeader>
        <CardContent className={cn('space-y-6', refreshing)}>
          {isFirstLoad ? (
            <>
              <Shimmer className="mx-auto h-56 w-56 rounded-full" />
              <div className="space-y-2">
                <Shimmer className="h-14" />
                <Shimmer className="h-14" />
                <Shimmer className="h-14" />
              </div>
            </>
          ) : breakdown.length === 0 ? (
            <EmptyState title="Belum ada pengeluaran" description="Catat pengeluaran agar laporan kategori muncul." />
          ) : (
            <>
              <div className="mx-auto h-72 w-full max-w-md">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="total" data={breakdown} nameKey="category_name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {breakdown.map((item, index) => (
                        <Cell key={item.category_id ?? item.category_name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        `${formatCurrency(value)} (${Math.round((value / breakdownTotal) * 100)}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {breakdown.map((item, index) => {
                  const key = categoryKey(item);
                  const isOpen = openCategory === key;
                  const rows = details[key];

                  return (
                    <div key={key} className="overflow-hidden rounded-xl bg-surface-100">
                      <button
                        type="button"
                        onClick={() => toggleCategory(item)}
                        aria-expanded={isOpen}
                        className="ui-hover-surface flex w-full items-center justify-between gap-3 p-3 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-body">{item.category_name}</p>
                            <p className="text-xs text-text-muted">{item.transaction_count} transaksi</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-text-title">{formatCurrency(item.total)}</p>
                            <p className="text-xs text-text-muted">
                              {breakdownTotal > 0 ? Math.round((item.total / breakdownTotal) * 100) : 0}%
                            </p>
                          </div>
                          <ChevronDown
                            size={16}
                            className={cn('text-text-muted transition-transform duration-300', isOpen && 'rotate-180')}
                          />
                        </div>
                      </button>

                      {/* grid-rows 0fr→1fr animates to the list's own height, whatever it turns out to be. */}
                      <div className={cn('grid transition-all duration-300 ease-out', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                        <div className="overflow-hidden">
                          <ul role="listbox" aria-label={`Transaksi ${item.category_name}`} className="max-h-72 overflow-y-auto border-t border-border-subtle px-3 py-1">
                            {rows === undefined ? (
                              <li className="py-2"><Shimmer className="h-10" /></li>
                            ) : rows.length === 0 ? (
                              <li className="py-3 text-sm text-text-muted">Tidak ada transaksi.</li>
                            ) : rows.map((row) => (
                              <li key={row.id} role="option" aria-selected="false" className="flex items-center justify-between gap-3 border-b border-border-subtle/60 py-2 last:border-0">
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-text-body">{row.description || 'Tanpa keterangan'}</p>
                                  <p className="text-xs text-text-muted">
                                    {formatDate(row.transaction_date)}{row.account_name ? ` · ${row.account_name}` : ''}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-text-title">{formatCurrency(row.amount)}</span>
                              </li>
                            ))}
                            {rows && rows.length < item.transaction_count && (
                              <li className="py-2 text-xs text-text-muted">
                                Menampilkan {rows.length} transaksi terbaru dari {item.transaction_count}.
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between rounded-xl border border-border-subtle px-3 py-2 text-sm">
                  <span className="text-text-muted">Total pengeluaran</span>
                  <span className="font-semibold text-text-title">{formatCurrency(breakdownTotal)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
