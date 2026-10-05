import { cn } from '../../lib/utils';

/** The one page heading: title on the left, actions on the right, nothing else competing with it. */
export default function PageHeader({ title, children, className }) {
  return (
    <header className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-3', className)}>
      <h1 className="text-xl font-semibold text-text-title md:text-2xl">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:*:flex-1">{children}</div>}
    </header>
  );
}
