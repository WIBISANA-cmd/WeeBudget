import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function ErrorState({ title = 'Terjadi kendala', message, onRetry }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-danger-base/20 bg-danger-base/5 p-6 text-center">
      <AlertTriangle className="mb-3 text-danger-base" size={28} />
      <p className="font-semibold text-text-title">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Coba lagi
        </Button>
      )}
    </div>
  );
}
