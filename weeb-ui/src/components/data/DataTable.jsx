import Button from '../ui/Button';

export default function DataTable({ columns, rows, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm shadow-slate-900/5">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-surface-100">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {column.label}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-100/80">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-4 py-4 text-sm text-text-body">
                    {column.render ? column.render(row) : row[column.key] ?? '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>Edit</Button>}
                      {onDelete && <Button size="sm" variant="danger" onClick={() => onDelete(row)}>Hapus</Button>}
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
