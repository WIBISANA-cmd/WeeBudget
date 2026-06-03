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
  const baseStyle = "inline-flex cursor-pointer items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-0 active:scale-95";
  
  const variants = {
    primary: "bg-primary-500 text-white shadow-glow-primary hover:bg-primary-600 hover:shadow-lg dark:text-slate-950",
    secondary: "bg-surface-panel text-text-body border border-border-subtle shadow-sm shadow-card-soft hover:border-primary-500 hover:bg-primary-500/5 hover:text-primary-600",
    outline: "border border-border-strong bg-surface-panel text-primary-600 hover:bg-primary-500/5",
    ghost: "bg-transparent text-primary-600 hover:bg-primary-500/10",
    danger: "bg-danger-base text-white hover:bg-danger-base/90 shadow-sm shadow-danger-base/20 dark:text-slate-950",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5 text-base",
    lg: "h-14 px-8 text-lg"
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
