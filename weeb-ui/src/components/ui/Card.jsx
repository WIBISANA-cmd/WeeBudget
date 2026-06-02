import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Card = forwardRef(({ className, interactive, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface-100 rounded-2xl border border-border-subtle shadow-card overflow-hidden",
        interactive && "transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-border-strong hover:shadow-glow-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-5 border-b border-border-subtle", className)} {...props}>
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, children, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-outfit font-medium text-text-title", className)} {...props}>
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-text-muted mt-1", className)} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-4 border-t border-border-subtle bg-white/60 flex items-center", className)} {...props}>
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
