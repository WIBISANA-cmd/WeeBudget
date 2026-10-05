import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';

export default function Modal(props) {
  const { open } = props;
  // The modal outlives `open` by one exit animation. Callers usually clear what they were showing
  // in the same breath as closing, so while it leaves it keeps drawing the last open content.
  const [hasExited, setExited] = useState(!open);
  const lastOpenProps = useRef(props);

  if (open && hasExited) setExited(false);

  useEffect(() => {
    if (open) lastOpenProps.current = props;
  });

  // Kunci scroll latar selama modal terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if ((!open && hasExited) || typeof document === 'undefined') return null;

  const { title, description, onClose, children, footer, fullScreenOnMobile } = open ? props : lastOpenProps.current;
  const state = open ? 'open' : 'closing';

  // Portal ke <body>: modal dipanggil dari dalam <main> yang punya stacking
  // context sendiri, sehingga z-index-nya kalah dari bottom-nav yang fixed.
  return createPortal(
    <div
      data-state={state}
      className={cn(
        "modal-scrim fixed inset-0 z-[200] flex bg-slate-950/45 p-0 md:items-center md:justify-center md:p-4",
        fullScreenOnMobile ? "items-stretch md:items-center md:justify-center" : "items-end justify-center",
        !open && "pointer-events-none",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-state={state}
        onAnimationEnd={(event) => {
          if (!open && event.target === event.currentTarget) setExited(true);
        }}
        className={cn(
          "modal-panel relative z-[201] overflow-hidden border border-border-subtle bg-surface-panel shadow-pop",
          fullScreenOnMobile
            ? "flex h-full w-full max-h-full flex-col rounded-none border-none md:h-auto md:w-full md:max-w-3xl md:max-h-[90vh] md:rounded-2xl md:border md:border-border-subtle"
            : "w-full max-h-[92dvh] rounded-t-2xl md:max-w-2xl md:rounded-2xl"
        )}
      >
        {!fullScreenOnMobile && (
          <div className="flex justify-center pt-3 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-surface-300" />
          </div>
        )}
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3 md:px-5",
            fullScreenOnMobile && "max-md:sticky max-md:top-0 max-md:z-10 max-md:bg-surface-panel max-md:pb-3 max-md:pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          )}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-title">{title}</h2>
            {description && <p className="mt-0.5 text-sm leading-6 text-text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="-mr-1 shrink-0 rounded-xl p-2 text-text-muted transition-colors duration-150 hover:bg-hover-soft hover:text-text-title"
          >
            <X size={20} />
          </button>
        </div>
        <div className={cn(
          "overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:px-5",
          fullScreenOnMobile
            ? "flex-1 max-h-none md:max-h-[calc(90vh-5.5rem)] md:pb-5"
            : "max-h-[72dvh] md:max-h-[calc(90vh-5.5rem)] md:pb-5"
        )}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border-subtle bg-surface-panel px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:px-5 md:py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Edit and delete buttons for the foot of a detail modal. Pass only the handlers that apply. */
export function DetailActions({ onEdit, onDelete, note }) {
  if (!onEdit && !onDelete) {
    return note ? <p className="text-center text-sm text-text-muted">{note}</p> : null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
      {onDelete && <Button variant="secondary" onClick={onDelete} className={cn('text-danger-base hover:bg-danger-soft hover:text-danger-base', !onEdit && 'col-span-2')}>Hapus</Button>}
      {onEdit && <Button onClick={onEdit} className={cn(!onDelete && 'col-span-2')}>Edit</Button>}
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
        <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
          <Button variant="danger" isLoading={isLoading} onClick={onConfirm}>Hapus</Button>
        </div>
      }
    />
  );
}
