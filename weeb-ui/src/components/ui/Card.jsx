import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Card = forwardRef(({ className, interactive, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-card transition-colors duration-200",
        interactive && "ui-hover-surface ui-hover-panel cursor-pointer",
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
  <div ref={ref} className={cn("border-b border-border-subtle px-4 py-3", className)} {...props}>
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, children, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-outfit text-base font-semibold text-text-title", className)} {...props}>
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("mt-0.5 text-sm text-text-muted", className)} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center border-t border-border-subtle bg-surface-panel px-4 py-3", className)} {...props}>
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
