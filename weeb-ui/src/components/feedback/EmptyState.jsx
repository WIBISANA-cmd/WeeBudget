import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', description, action }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-100 p-5 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-600">
        <Inbox size={22} />
      </span>
      <p className="text-base font-semibold text-text-title">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
