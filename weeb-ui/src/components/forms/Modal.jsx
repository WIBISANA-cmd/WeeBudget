import { X } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';

export default function Modal({ title, description, open, onClose, children, footer, fullScreenOnMobile }) {
  if (!open) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[200] flex bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-4",
      fullScreenOnMobile ? "items-stretch" : "items-end justify-center"
    )}>
      <div className={cn(
        "relative z-[201] overflow-hidden border bg-surface-panel shadow-card border-border-subtle md:max-h-[90vh] md:max-w-2xl md:rounded-[28px]",
        fullScreenOnMobile
          ? "flex flex-col h-[100dvh] w-full max-h-[100dvh] rounded-none border-none md:h-auto md:max-h-[90vh] md:rounded-[28px] md:border md:border-border-subtle"
          : "max-h-[92dvh] w-full rounded-t-[28px]"
      )}>
        {!fullScreenOnMobile && (
          <div className="flex justify-center pt-3 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-surface-300" />
          </div>
        )}
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6",
            fullScreenOnMobile && "sticky top-0 z-10 bg-surface-panel/96 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+0.875rem)] backdrop-blur-xl"
          )}
        >
          <div>
            <h2 className={cn("text-lg font-semibold text-text-title", fullScreenOnMobile && "text-xl font-bold tracking-tight")}>
              {title}
            </h2>
            {description && (
              <p className={cn("mt-1 text-sm text-text-muted", fullScreenOnMobile && "mt-1.5 max-w-[18rem] text-[13px] leading-5")}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className={cn(
              "rounded-2xl p-2.5 text-text-muted hover:bg-surface-100 hover:text-text-title",
              fullScreenOnMobile && "mt-0.5 rounded-full border border-border-subtle bg-surface-100/90 p-3 shadow-sm"
            )}
          >
            <X size={20} />
          </button>
        </div>
        <div className={cn(
          "overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:max-h-[65vh] md:px-6 md:pb-5 md:pt-5",
          fullScreenOnMobile ? "flex-1 max-h-none px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5" : "max-h-[72dvh]"
        )}>
          {children}
        </div>
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
