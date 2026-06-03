import { X } from 'lucide-react';
import Button from '../ui/Button';

export default function Modal({ title, description, open, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-title">{title}</h2>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-text-muted hover:bg-surface-100 hover:text-text-title">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-border-subtle px-5 py-4">{footer}</div>}
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
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
          <Button variant="danger" isLoading={isLoading} onClick={onConfirm}>Hapus</Button>
        </div>
      }
    />
  );
}
