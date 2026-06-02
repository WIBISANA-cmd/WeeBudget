import { Sparkles } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', description, action }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary-500/20 bg-primary-500/5 p-6 text-center">
      <Sparkles className="mb-3 text-primary-600" size={24} />
      <p className="font-medium text-text-title">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
