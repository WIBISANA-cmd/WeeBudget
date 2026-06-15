import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const Input = forwardRef(({ 
  className, 
  label,
  error, 
  helperText,
  isValid,
  icon: Icon,
  ...props 
}, ref) => {
  const normalizedValue = typeof props.value === 'number' && !Number.isFinite(props.value)
    ? ''
    : props.value;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-text-body">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex w-full rounded-xl bg-surface-panel border border-border-subtle px-4 py-3 text-sm text-text-title shadow-sm shadow-card-soft transition-colors placeholder:text-text-muted",
            "focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            Icon && "pl-10",
            (error || isValid) && "pr-10",
            error && "border-danger-base focus-visible:border-danger-base focus-visible:ring-danger-base",
            isValid && !error && "border-success-base focus-visible:border-success-base focus-visible:ring-success-base",
            className
          )}
          {...props}
          value={normalizedValue}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-base">
            <AlertCircle size={18} />
          </div>
        )}
        {isValid && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success-base">
            <CheckCircle2 size={18} />
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={cn("text-xs font-medium", error ? "text-danger-base" : "text-text-muted")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
