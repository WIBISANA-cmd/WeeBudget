import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function ErrorState({ title = 'Terjadi kendala', message, onRetry }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-danger-line bg-danger-soft p-5 text-center">
      <AlertTriangle className="mb-3 text-danger-base" size={26} />
      <p className="font-semibold text-text-title">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-text-body">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={() => onRetry()}>
          <RefreshCw size={16} className="mr-2" />
          Coba lagi
        </Button>
      )}
    </div>
  );
}
