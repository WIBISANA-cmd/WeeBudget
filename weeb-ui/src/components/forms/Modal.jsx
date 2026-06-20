import { X } from 'lucide-react';
import Button from '../ui/Button';

export default function Modal({ title, description, open, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="relative z-[201] max-h-[92dvh] w-full overflow-hidden rounded-t-[28px] border border-border-subtle bg-surface-panel shadow-card md:max-h-[90vh] md:max-w-2xl md:rounded-[28px]">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-surface-300" />
        </div>
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6">
          <div>
            <h2 className="text-lg font-semibold text-text-title">{title}</h2>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-2xl p-2.5 text-text-muted hover:bg-surface-100 hover:text-text-title">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[72dvh] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:max-h-[65vh] md:px-6 md:pb-5 md:pt-5">{children}</div>
        {footer && <div className="border-t border-border-subtle px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-6 md:py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title = 'Hapus data?', description, onCancel, onConfirm, isLoading }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="grid grid-cols-2 gap-3 md:flex md:justify-end">
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
          <Button variant="danger" isLoading={isLoading} onClick={onConfirm}>Hapus</Button>
        </div>
      }
    />
  );
}
