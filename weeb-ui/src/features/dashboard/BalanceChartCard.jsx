import { useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Segmented from '../../components/ui/Segmented';
import { ChartSkeleton, Skeleton } from '../../components/feedback/LoadingSkeleton';
import { useCountUp } from '../../hooks/useCountUp';
import { cn } from '../../lib/utils';
import { compactCurrency, formatCurrency } from '../../lib/formatters';
import { longDate, RANGES } from './chartData';

const SERIES = [
  { key: 'balance', label: 'Sisa saldo', color: 'var(--color-primary-500)', dot: 'bg-primary-500' },
  { key: 'income', label: 'Pemasukan', color: 'var(--color-success-base)', dot: 'bg-success-base' },
  { key: 'expense', label: 'Pengeluaran', color: 'var(--color-danger-base)', dot: 'bg-danger-base' },
];

const STAT_CELLS = [
  'border-b border-r md:border-b-0',
  'border-b md:border-b-0 md:border-r',
  'border-r',
  '',
];

const CHART_HEIGHT = 'h-64 md:h-80';

/** A change figure the way a ticker shows it: arrow, amount, colour by direction. */
export function Delta({ value, percent, className }) {
  const amount = Number(value || 0);
  const tone = amount > 0 ? 'bg-success-soft text-success-base' : amount < 0 ? 'bg-danger-soft text-danger-base' : 'bg-surface-100 text-text-muted';
  const Icon = amount > 0 ? ArrowUpRight : amount < 0 ? ArrowDownRight : Minus;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums', tone, className)}>
      <Icon size={14} />
      {amount > 0 ? '+' : amount < 0 ? '-' : ''}{formatCurrency(Math.abs(amount))}
      {Number.isFinite(percent) && <span>({Math.abs(percent).toFixed(1)}%)</span>}
    </span>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-xl border border-border-subtle bg-surface-panel px-3 py-2.5 text-xs shadow-pop">
      <p className="font-semibold text-text-title">{longDate(payload[0].payload.date)}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1.5 flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.name}
          </span>
          <span className="font-semibold tabular-nums text-text-title">{formatCurrency(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** The newest point of the balance line, with a halo that keeps breathing. */
function LivePoint({ cx, cy }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  return (
    // Held back until the line has finished drawing up to it.
    <g className="page-fade-in" style={{ animationDelay: '1000ms' }}>
      <circle cx={cx} cy={cy} r={4} fill="var(--color-primary-500)" className="chart-pulse" />
      <circle cx={cx} cy={cy} r={4.5} fill="var(--color-primary-500)" stroke="var(--color-surface-panel)" strokeWidth={2} />
    </g>
  );
}

/** Mirrors the card below: headline block, range switch, legend chips, chart, four stat cells. */
export function BalanceChartCardSkeleton() {
  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-9 w-56 md:h-10 md:w-64" />
            <div className="mt-2.5 flex items-center gap-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
          <Skeleton className="h-9 w-52 rounded-xl" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['w-24', 'w-28', 'w-28'].map((width, index) => (
            <Skeleton key={index} className={cn('h-8 rounded-full', width)} />
          ))}
        </div>
        <ChartSkeleton className={cn('mt-3', CHART_HEIGHT)} />
      </div>
      <div className="grid grid-cols-2 border-t border-border-subtle md:grid-cols-4">
        {STAT_CELLS.map((border, index) => (
          <div key={index} className={cn('border-border-subtle p-4', border)}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-6 w-28" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * The dashboard headline: what is left to spend, how it moved over the chosen range, and the
 * money in and out behind that movement, all on one animated line chart.
 */
export default function BalanceChartCard({
  title,
  status,
  balance,
  chart,
  rangeKey,
  onRangeChange,
  rangeCaption,
  stats,
  isLoading,
  isRefreshing,
  error,
}) {
  const [visible, setVisible] = useState({ balance: true, income: true, expense: true });
  const animatedBalance = useCountUp(balance);
  const lastPoint = chart.points[chart.points.length - 1];
  const changePercent = chart.openingBalance > 0 ? (chart.net / chart.openingBalance) * 100 : NaN;

  // The last visible line stays on: an empty chart tells nobody anything.
  const toggle = (key) => setVisible((current) => {
    const next = { ...current, [key]: !current[key] };
    return Object.values(next).some(Boolean) ? next : current;
  });

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-muted">{title}</p>
              {status && <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', status.cls)}>{status.label}</span>}
            </div>
            <p className="mt-1 font-outfit text-3xl font-semibold tabular-nums text-text-title md:text-4xl">
              {formatCurrency(Math.round(animatedBalance))}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {isLoading ? <Skeleton className="h-5 w-36 rounded-md" /> : <Delta value={chart.net} percent={changePercent} />}
              <span className="text-text-muted">{rangeCaption}</span>
            </div>
          </div>
          <Segmented label="Rentang waktu" options={RANGES} value={rangeKey} onChange={onRangeChange} />
        </div>

        {/* The legend doubles as the controls: tap a series to hide or show its line. */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SERIES.map((series) => (
            <button
              key={series.key}
              type="button"
              aria-pressed={visible[series.key]}
              onClick={() => toggle(series.key)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all duration-200 active:scale-95',
                visible[series.key]
                  ? 'border-border-subtle bg-surface-100 text-text-title'
                  : 'border-border-subtle bg-surface-panel text-text-muted',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full transition-transform duration-200', series.dot, !visible[series.key] && 'scale-50 bg-surface-300')} />
              {series.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <ChartSkeleton className={cn('mt-3', CHART_HEIGHT)} />
        ) : error && chart.points.length === 0 ? (
          <div className={cn('mt-3 flex items-center justify-center rounded-xl bg-surface-100 text-sm text-text-muted', CHART_HEIGHT)}>
            {error}
          </div>
        ) : (
          <div className={cn('page-fade-in mt-3 transition-opacity duration-300', CHART_HEIGHT, isRefreshing && 'opacity-40')}>
            <ResponsiveContainer width="100%" height="100%">
              {/* Keyed by range: a new range redraws the lines from the left instead of morphing. */}
              <LineChart key={`${rangeKey}-${chart.points.length}`} data={chart.points} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={compactCurrency}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: 'var(--color-text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  animationDuration={180}
                />
                {/* Where the balance stood when the range opened. */}
                {visible.balance && <ReferenceLine y={chart.openingBalance} stroke="var(--color-surface-300)" strokeDasharray="2 6" />}
                {SERIES.map((series, index) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    hide={!visible[series.key]}
                    stroke={series.color}
                    strokeWidth={series.key === 'balance' ? 3 : 2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--color-surface-panel)' }}
                    animationBegin={index * 160}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                ))}
                {visible.balance && lastPoint && (
                  <ReferenceDot x={lastPoint.label} y={lastPoint.balance} shape={<LivePoint />} ifOverflow="extendDomain" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 border-t border-border-subtle md:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className={cn('min-w-0 border-border-subtle p-4', STAT_CELLS[index])}>
            <dt className="text-sm text-text-muted">{stat.label}</dt>
            {stat.isLoading
              ? <Skeleton className="mt-2 h-6 w-28" />
              : <dd className={cn('mt-1 truncate text-lg font-semibold tabular-nums', stat.tone)}>{stat.value}</dd>}
            <p className="mt-0.5 truncate text-xs text-text-muted">{stat.hint}</p>
          </div>
        ))}
      </dl>
    </Card>
  );
}
