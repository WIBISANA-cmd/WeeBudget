import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { PageHeaderSkeleton, Skeleton } from '../../components/feedback/LoadingSkeleton';
import { cn } from '../../lib/utils';

const WIDTHS = ['w-40', 'w-28', 'w-36', 'w-32', 'w-44', 'w-24'];

/** The records table of a dynamic entity: its real column headers over placeholder cells. */
export function RecordsTableSkeleton({ fields = [], hasActions = true, rows = 6 }) {
  const columns = fields.length > 0 ? fields : Array.from({ length: 4 }, (_, index) => ({ key: `placeholder-${index}`, label: '' }));

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle text-left text-sm">
          <thead className="bg-surface-100 text-xs font-semibold text-text-muted">
            <tr>
              <th className="w-16 px-5 py-3.5">#</th>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3.5">
                  {column.label || <Skeleton className="h-3 w-20 bg-surface-300" />}
                </th>
              ))}
              {hasActions && <th className="w-24 px-5 py-3.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="px-5 py-4"><Skeleton className="h-3.5 w-5" /></td>
                {columns.map((column, columnIndex) => (
                  <td key={column.key} className="px-5 py-4">
                    <div className="flex h-5 items-center">
                      <Skeleton className={cn('h-3.5', columnIndex === 0 ? WIDTHS[rowIndex % WIDTHS.length] : 'w-24')} />
                    </div>
                  </td>
                ))}
                {hasActions && (
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A dynamic entity page before its schema is known: heading, toolbar, then the table. */
export function DynamicCrudSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4" aria-busy="true">
      <PageHeaderSkeleton actions={2} titleWidth="w-48" />
      <div className="rounded-2xl border border-border-subtle bg-surface-panel p-3">
        <Skeleton className="h-11 w-full rounded-xl md:max-w-sm" />
      </div>
      <RecordsTableSkeleton />
    </div>
  );
}

/** Schema builder: the entity list on the left, the selected entity's fields on the right. */
export function EntityListSkeleton() {
  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="h-fit">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-subtle">
            {WIDTHS.slice(0, 4).map((width, index) => (
              <div key={index} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Skeleton className={cn('h-4', width)} />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Skeleton className="h-5 w-28 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {WIDTHS.slice(0, 5).map((width, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div>
                <Skeleton className={cn('h-3.5', width)} />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** The checklist of a table's columns while they are being introspected. */
export function ColumnListSkeleton() {
  return (
    <div className="space-y-1 rounded-xl border border-border-subtle bg-surface-panel p-2">
      {['w-28', 'w-36', 'w-24', 'w-32'].map((width, index) => (
        <div key={index} className="flex items-center gap-2.5 px-2 py-1.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className={cn('h-3.5', width)} />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Menu settings: one row per menu with its icon, label, path, move buttons and switch. */
export function MenuListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-3.5 w-full max-w-lg" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-subtle">
          {WIDTHS.map((width, index) => (
            <div key={index} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <Skeleton className={cn('h-4', width)} />
                  <Skeleton className="mt-2 h-3 w-52 max-w-full" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden items-center gap-1 sm:flex">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
