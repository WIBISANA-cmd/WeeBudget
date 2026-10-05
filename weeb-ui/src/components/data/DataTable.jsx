import { Fragment, useState } from 'react';
import { ArrowDownUp, ChevronRight, CircleDollarSign, Pencil, PiggyBank, ShieldAlert, Sparkles, Tag, Trash2 } from 'lucide-react';
import { Skeleton } from '../feedback/LoadingSkeleton';
import Modal, { DetailActions } from '../forms/Modal';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const mobilePriorityKeys = [
  'amount',
  'status',
  'transaction_date',
  'range',
  'account',
  'source',
  'payday_date',
  'entry_type',
  'description',
  'need_type',
  'transaction_type',
];

// Shared by the table and its skeleton so the placeholder lines up cell for cell.
const frameClass = 'overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel';
const headCellClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-text-muted';
const bodyCellClass = 'px-4 py-3 align-middle text-sm text-text-body';
const mobileRowClass = 'row-press flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left';
const iconButtonClass ='flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-150';

function renderColumnValue(column, row) {
  return column.render ? column.render(row) : row[column.key] ?? '-';
}

function getDefaultMobileColumns(columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return { title: null, details: [] };
  }

  const title = columns.find((column) => column.mobileTitle) || columns[0];
  const detailCandidates = columns.filter((column) => column !== title && column.mobileHidden !== true);
  const sortedDetails = [...detailCandidates].sort((left, right) => {
    const leftPriority = mobilePriorityKeys.indexOf(left.key);
    const rightPriority = mobilePriorityKeys.indexOf(right.key);
    const leftScore = leftPriority === -1 ? 999 : leftPriority;
    const rightScore = rightPriority === -1 ? 999 : rightPriority;
    return leftScore - rightScore;
  });

  return {
    title,
    details: sortedDetails.slice(0, 2),
  };
}

function CategoryIcon({ row }) {
  const iconProps = { size: 18, strokeWidth: 2 };

  if (row.transaction_type === 'income') {
    return <CircleDollarSign {...iconProps} />;
  }

  if (row.need_type === 'need') {
    return <Tag {...iconProps} />;
  }

  if (row.need_type === 'want') {
    return <Sparkles {...iconProps} />;
  }

  if (row.need_type === 'saving') {
    return <PiggyBank {...iconProps} />;
  }

  if (row.need_type === 'debt') {
    return <ShieldAlert {...iconProps} />;
  }

  return <ArrowDownUp {...iconProps} />;
}

function RowActions({ row, onEdit, onDelete, canEditRow, canDeleteRow }) {
  const canEdit = onEdit && (!canEditRow || canEditRow(row));
  const canDelete = onDelete && (!canDeleteRow || canDeleteRow(row));

  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex shrink-0 justify-end gap-1">
      {canEdit && (
        <button type="button" onClick={() => onEdit(row)} aria-label="Edit" title="Edit" className={cn(iconButtonClass, 'hover:bg-primary-soft hover:text-primary-600')}>
          <Pencil size={16} />
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={() => onDelete(row)} aria-label="Hapus" title="Hapus" className={cn(iconButtonClass, 'hover:bg-danger-soft hover:text-danger-base')}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

/** Allocations only move money between own accounts, so they count as neither income nor expense. */
function dayTotals(rows) {
  return rows.reduce((totals, row) => {
    if (row.entry_type === 'account_allocation') return totals;
    const amount = Number(row.amount || 0);
    if (row.transaction_type === 'income') totals.income += amount;
    if (row.transaction_type === 'expense') totals.expense += amount;
    return totals;
  }, { income: 0, expense: 0 });
}

function groupByDate(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const date = row.transaction_date || '';
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(row);
  });
  return [...groups.entries()];
}

export default function DataTable({ columns, rows, onEdit, onDelete, canEditRow, canDeleteRow, mobileLayout }) {
  const [detailRow, setDetailRow] = useState(null);
  const hasActions = Boolean(onEdit || onDelete);
  const actionProps = { onEdit, onDelete, canEditRow, canDeleteRow };
  const isTransactions = rows.length > 0 && rows.some((row) => 'transaction_date' in row && 'transaction_type' in row);
  const mobileColumns = getDefaultMobileColumns(columns);
  // The two most telling fields ride along on the row: one at the right edge, one under the title.
  const [mobileTrailing, mobileSubtitle] = mobileColumns.details;
  const titleColumn = mobileLayout === 'categories' ? columns.find((column) => column.key === 'name') : mobileColumns.title;
  const canEditDetail = Boolean(detailRow && onEdit && (!canEditRow || canEditRow(detailRow)));
  const canDeleteDetail = Boolean(detailRow && onDelete && (!canDeleteRow || canDeleteRow(detailRow)));

  const renderRow = (row) => (
    <tr key={row.id} className="ui-hover-surface">
      {columns.map((column) => (
        <td key={column.key} className={bodyCellClass}>
          {renderColumnValue(column, row)}
        </td>
      ))}
      {hasActions && (
        <td className="w-px whitespace-nowrap px-4 py-2 align-middle">
          <RowActions row={row} {...actionProps} />
        </td>
      )}
    </tr>
  );

  return (
    <>
      {/* Mobile: a row is a summary; tapping it opens every field with edit and delete at the foot. */}
      <div className={cn(frameClass, 'divide-y divide-border-subtle md:hidden')}>
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setDetailRow(row)} className={mobileRowClass}>
            {mobileLayout === 'categories' && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-600">
                <CategoryIcon row={row} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text-title">
                {mobileLayout === 'categories' ? row.name : mobileColumns.title && renderColumnValue(mobileColumns.title, row)}
              </span>
              {mobileLayout !== 'categories' && mobileSubtitle && (
                <span className="mt-0.5 block truncate text-xs text-text-muted">{renderColumnValue(mobileSubtitle, row)}</span>
              )}
            </span>
            {mobileLayout !== 'categories' && mobileTrailing && (
              <span className="shrink-0 text-right text-sm text-text-body">{renderColumnValue(mobileTrailing, row)}</span>
            )}
            <ChevronRight size={16} className="shrink-0 text-text-muted" />
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title={detailRow && titleColumn ? renderColumnValue(titleColumn, detailRow) : 'Detail'}
        footer={detailRow && (canEditDetail || canDeleteDetail) ? (
          <DetailActions
            onEdit={canEditDetail ? () => { setDetailRow(null); onEdit(detailRow); } : undefined}
            onDelete={canDeleteDetail ? () => { setDetailRow(null); onDelete(detailRow); } : undefined}
          />
        ) : undefined}
      >
        {detailRow && (
          <dl className="divide-y divide-border-subtle text-sm">
            {columns.filter((column) => column !== titleColumn).map((column) => (
              <div key={column.key} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-text-muted">{column.label}</dt>
                <dd className="min-w-0 text-right font-medium text-text-title">{renderColumnValue(column, detailRow)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <div className={cn(frameClass, 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-100">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={headCellClass}>{column.label}</th>
                ))}
                {hasActions && <th className={cn(headCellClass, 'text-right')}><span className="sr-only">Aksi</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {!isTransactions ? rows.map(renderRow) : groupByDate(rows).map(([date, groupRows]) => {
                const totals = dayTotals(groupRows);

                return (
                  <Fragment key={date || 'undated'}>
                    <tr className="bg-surface-100">
                      <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-2">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-semibold text-text-title">{date ? formatDate(date) : 'Tanpa tanggal'}</span>
                          <span className="flex items-center gap-4 font-semibold tabular-nums">
                            {totals.income > 0 && <span className="text-success-base">+{formatCurrency(totals.income)}</span>}
                            {totals.expense > 0 && <span className="text-danger-base">-{formatCurrency(totals.expense)}</span>}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {groupRows.map(renderRow)}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const PILL_KEY = /status|type|purpose|role|scope|is_active/;
const DATE_KEY = /date|_at$|month/;
const MONEY_KEY = /amount|balance|income|expense|price|nominal/;
const TEXT_WIDTHS = ['w-44', 'w-32', 'w-52', 'w-36', 'w-40', 'w-28'];

/** A placeholder shaped like what the column holds: a badge, a date, a figure or a line of text. */
function CellSkeleton({ column, rowIndex, isFirst }) {
  if (PILL_KEY.test(column.key)) return <Skeleton className="h-5 w-16 rounded-md" />;
  if (DATE_KEY.test(column.key)) return <Skeleton className="h-3.5 w-20" />;
  if (MONEY_KEY.test(column.key)) return <Skeleton className="h-3.5 w-24" />;
  if (column.key === 'range') return <Skeleton className="h-3.5 w-40" />;

  return <Skeleton className={cn('h-3.5 max-w-full', isFirst || column.key === 'description' ? TEXT_WIDTHS[rowIndex % TEXT_WIDTHS.length] : 'w-24')} />;
}

/** The table before its rows arrive: real column headers, placeholder cells in the real grid. */
export function DataTableSkeleton({ columns = [], rows = 6, hasActions = true, mobileLayout, grouped = false }) {
  const mobileColumns = getDefaultMobileColumns(columns);
  const indexes = Array.from({ length: rows }, (_, index) => index);
  // Transactions arrive grouped per day: a date bar opens each run of rows.
  const groupBar = (
    <tr className="bg-surface-100">
      <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-2">
        <div className="flex h-4 items-center justify-between gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <div className={cn(frameClass, 'divide-y divide-border-subtle md:hidden')}>
        {indexes.map((index) => (
          <div key={index} className={mobileRowClass}>
            {mobileLayout === 'categories' && <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />}
            <div className="min-w-0 flex-1">
              <Skeleton className={cn('h-3.5 max-w-full', TEXT_WIDTHS[index % TEXT_WIDTHS.length])} />
              {mobileLayout !== 'categories' && mobileColumns.details[1] && <Skeleton className="mt-2 h-3 w-24" />}
            </div>
            {mobileLayout !== 'categories' && mobileColumns.details[0] && (
              <CellSkeleton column={mobileColumns.details[0]} rowIndex={index} />
            )}
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
          </div>
        ))}
      </div>

      <div className={cn(frameClass, 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-100">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={headCellClass}>{column.label}</th>
                ))}
                {hasActions && <th className={headCellClass} />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {indexes.map((index) => (
                <Fragment key={index}>
                  {grouped && index % 3 === 0 && groupBar}
                  <tr>
                    {columns.map((column, columnIndex) => (
                      <td key={column.key} className={bodyCellClass}>
                        <div className="flex h-5 items-center">
                          <CellSkeleton column={column} rowIndex={index} isFirst={columnIndex === 0} />
                        </div>
                      </td>
                    ))}
                    {hasActions && (
                      <td className="w-px whitespace-nowrap px-4 py-2 align-middle">
                        <Skeleton className="ml-auto h-8 w-[68px] rounded-lg" />
                      </td>
                    )}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
