import { Sparkles } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', description, action }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-primary-500/20 bg-[linear-gradient(180deg,rgba(15,60,113,0.08),rgba(15,60,113,0.03))] p-6 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-panel text-primary-600 shadow-card-soft">
        <Sparkles size={24} />
      </span>
      <p className="text-base font-semibold text-text-title">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
