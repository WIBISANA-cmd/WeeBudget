import { cn } from '../../lib/utils';

/*
 * Skeletons mirror the layout they stand in for: same paddings, same grid, and each placeholder
 * sized like the text or control it replaces, so nothing jumps when the data lands.
 */

/** One placeholder block. Size it with the same height/width the real content takes. */
export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('skeleton', className)} />;
}

/** Kept for existing callers. */
export const Shimmer = Skeleton;

const card = 'rounded-2xl border border-border-subtle bg-surface-panel';

/** Page title on the left, action buttons on the right. */
export function PageHeaderSkeleton({ actions = 1, titleWidth = 'w-40' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className={cn('h-7', titleWidth)} />
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** A label line over a figure, the shape of every stat tile. */
export function StatSkeleton({ className, valueWidth = 'w-32', hint = false }) {
  return (
    <div className={className}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className={cn('mt-2.5 h-7', valueWidth)} />
      {hint && <Skeleton className="mt-2 h-3 w-28" />}
    </div>
  );
}

export function StatCardsSkeleton({ count = 3, className = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4', hint = false }) {
  const widths = ['w-36', 'w-32', 'w-28', 'w-32'];

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(card, 'p-4')}>
          <StatSkeleton valueWidth={widths[index % widths.length]} hint={hint} />
        </div>
      ))}
    </div>
  );
}

/** Rows of: leading icon, two text lines, trailing amount. */
export function ListRowsSkeleton({ rows = 5, leading = true, className }) {
  const widths = ['w-40', 'w-28', 'w-36', 'w-32', 'w-44', 'w-24'];

  return (
    <div className={cn('divide-y divide-border-subtle', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          {leading && <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <Skeleton className={cn('h-3.5 max-w-full', widths[index % widths.length])} />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** A horizontal strip of account chips: name over balance. */
export function ChipRowSkeleton({ count = 3 }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="shrink-0 rounded-xl border border-border-subtle px-4 py-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-1.5 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Label over input, laid out on the same two-column grid as ResourceForm. */
export function FormSkeleton({ fields = 6, columns = 2, submit = true }) {
  const labels = ['w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-24'];

  return (
    <div className={cn('grid gap-4', columns === 2 && 'md:grid-cols-2')}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className={cn('h-3.5', labels[index % labels.length])} />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      {submit && (
        <div className={cn('flex justify-end pt-1', columns === 2 && 'md:col-span-2')}>
          <Skeleton className="h-10 w-full rounded-xl md:w-44" />
        </div>
      )}
    </div>
  );
}

// A fixed, plausible-looking curve so the placeholder reads as "a line chart goes here".
const CHART_POINTS = '0,62 8,58 16,60 24,48 32,52 40,40 48,44 56,30 64,34 72,22 80,26 88,14 100,18';

/** Y-axis ticks, grid lines, a line and X-axis ticks, in the proportions the real chart uses. */
export function ChartSkeleton({ className = 'h-72', xTicks = 6 }) {
  return (
    <div aria-hidden="true" className={cn('flex gap-3', className)}>
      <div className="flex w-10 shrink-0 flex-col justify-between pb-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-8" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-px w-full bg-border-subtle" />
            ))}
          </div>
          <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="skeleton absolute inset-0 h-full w-full bg-transparent">
            <polyline
              points={CHART_POINTS}
              fill="none"
              stroke="var(--color-surface-300)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="flex h-6 items-end justify-between">
          {Array.from({ length: xTicks }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-9" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A donut the size of the category pie, beside nothing: callers put the legend rows under it. */
export function DonutSkeleton({ className = 'h-52 w-52' }) {
  return (
    <div aria-hidden="true" className={cn('skeleton relative mx-auto rounded-full', className)}>
      <div className="absolute inset-[22%] rounded-full bg-surface-panel" />
    </div>
  );
}

/** Generic page body for a route chunk that is still downloading: header, stat tiles, a list. */
export function PageLoader() {
  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} className="grid gap-3 md:grid-cols-3" />
      <div className={cn(card, 'px-4')}>
        <ListRowsSkeleton rows={6} />
      </div>
    </div>
  );
}

/** The whole app frame, for the moments before the layout itself can render. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-bg-base">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface-panel md:flex">
        <div className="flex h-14 items-center border-b border-border-subtle px-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-1.5 p-3">
          {['w-28', 'w-36', 'w-24', 'w-32', 'w-28', 'w-20', 'w-32'].map((width, index) => (
            <div key={index} className="flex h-10 items-center gap-3 px-3">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className={cn('h-3.5', width)} />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface-panel px-3 md:px-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <div className="p-3 md:p-4">
          <PageLoader />
        </div>
      </div>
    </div>
  );
}

/** The sign-in card: brand row, heading, two fields, the submit button. */
export function AuthSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base px-4 py-6">
      <div className={cn(card, 'w-full max-w-md p-8')}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="mt-10 h-8 w-48" />
        <Skeleton className="mt-3 h-3.5 w-64 max-w-full" />
        <div className="mt-8 space-y-5">
          {[0, 1].map((index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-[52px] w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-[52px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Fallback for callers with no specific shape: a card of list rows. */
export default function LoadingSkeleton({ rows = 4 }) {
  return <ListRowsSkeleton rows={rows} />;
}
