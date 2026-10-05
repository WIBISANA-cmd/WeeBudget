import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const Button = forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  ...props
}, ref) => {
  const baseStyle = "inline-flex cursor-pointer items-center justify-center rounded-xl font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985]";

  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-hover",
    secondary: "border border-border-subtle bg-surface-panel text-text-body hover:bg-hover-soft hover:text-text-title",
    outline: "border border-border-strong bg-surface-panel text-primary-600 hover:bg-primary-soft",
    ghost: "bg-transparent text-primary-600 hover:bg-primary-soft",
    accent: "bg-accent-strong text-white hover:bg-violet-800",
    danger: "bg-danger-base text-white hover:opacity-90 dark:text-slate-950",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(baseStyle, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
