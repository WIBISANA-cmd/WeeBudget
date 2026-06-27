import { ArrowDownUp, CircleDollarSign, Pencil, PiggyBank, ShieldAlert, Sparkles, Tag, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

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

export default function DataTable({ columns, rows, onEdit, onDelete, canEditRow, canDeleteRow, mobileLayout }) {
  return (
    <>
      {mobileLayout === 'accounts' ? (
        <div className="divide-y divide-border-subtle rounded-3xl border border-border-subtle bg-surface-panel shadow-sm shadow-card-soft md:hidden">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="ui-hover-surface flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold text-text-muted">
                  {index + 1}
                </span>
                <span className="truncate text-base font-semibold text-text-title">
                  {row.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onEdit && (!canEditRow || canEditRow(row)) && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="ui-hover-surface ui-hover-panel ui-hover-icon flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border-subtle bg-surface-panel text-text-body duration-200 active:scale-95"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {onDelete && (!canDeleteRow || canDeleteRow(row)) && (
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="ui-hover-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border-subtle bg-surface-panel text-danger-base duration-200 hover:border-danger-base hover:bg-danger-base/10 active:scale-95"
                    aria-label="Hapus"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : mobileLayout === 'categories' ? (
        <div className="divide-y divide-border-subtle rounded-3xl border border-border-subtle bg-surface-panel shadow-sm shadow-card-soft md:hidden">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="ui-hover-surface flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold text-text-muted">
                  {index + 1}
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
                  <CategoryIcon row={row} />
                </span>
                <span className="min-w-0 truncate text-base font-semibold text-text-title">
                  {row.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onEdit && (!canEditRow || canEditRow(row)) && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="ui-hover-surface ui-hover-panel ui-hover-icon flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border-subtle bg-surface-panel text-text-body duration-200 active:scale-95"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {onDelete && (!canDeleteRow || canDeleteRow(row)) && (
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="ui-hover-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border-subtle bg-surface-panel text-danger-base duration-200 hover:border-danger-base hover:bg-danger-base/10 active:scale-95"
                    aria-label="Hapus"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle rounded-3xl border border-border-subtle bg-surface-panel shadow-sm shadow-card-soft md:hidden">
          {rows.map((row, index) => {
            const mobileColumns = getDefaultMobileColumns(columns);
            return (
              <div key={row.id} className="ui-hover-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold text-text-muted">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        {mobileColumns.title && (
                          <>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                              {mobileColumns.title.label}
                            </p>
                            <div className="mt-1 truncate text-base font-semibold text-text-title">
                              {renderColumnValue(mobileColumns.title, row)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {mobileColumns.details.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {mobileColumns.details.map((column) => (
                          <div key={column.key} className="flex items-start justify-between gap-4">
                            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                              {column.label}
                            </span>
                            <div className="max-w-[62%] text-right text-sm text-text-body">
                              {renderColumnValue(column, row)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {((onEdit && (!canEditRow || canEditRow(row))) || (onDelete && (!canDeleteRow || canDeleteRow(row)))) && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {onEdit && (!canEditRow || canEditRow(row)) && <Button size="sm" variant="secondary" onClick={() => onEdit(row)} className="w-full">Edit</Button>}
                    {onDelete && (!canDeleteRow || canDeleteRow(row)) && <Button size="sm" variant="danger" onClick={() => onDelete(row)} className="w-full">Hapus</Button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="hidden overflow-hidden rounded-[30px] border border-border-subtle bg-surface-panel shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-subtle">
            <thead className="bg-surface-100/90 backdrop-blur">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {column.label}
                  </th>
                ))}
                {(onEdit || onDelete) && <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-panel">
              {rows.map((row) => (
                <tr key={row.id} className="ui-hover-surface duration-200">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-5 py-4 align-top text-sm leading-6 text-text-body"
                    >
                      {column.render ? column.render(row) : row[column.key] ?? '-'}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="whitespace-nowrap px-5 py-4 text-right align-top">
                      {((onEdit && (!canEditRow || canEditRow(row))) || (onDelete && (!canDeleteRow || canDeleteRow(row)))) ? (
                        <div className="flex justify-end gap-2">
                          {onEdit && (!canEditRow || canEditRow(row)) && <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>Edit</Button>}
                          {onDelete && (!canDeleteRow || canDeleteRow(row)) && <Button size="sm" variant="danger" onClick={() => onDelete(row)}>Hapus</Button>}
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
