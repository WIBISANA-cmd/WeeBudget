import { cn } from '../../lib/utils';

/** A compact either/or switch: tabs for a view, a range for a chart. The pill slides to the choice. */
export default function Segmented({ options, value, onChange, label, size = 'sm', className }) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div
      role="tablist"
      aria-label={label}
      // Equal columns, so the pill's width and travel are simple fractions of the track.
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className={cn('relative inline-grid rounded-xl bg-surface-100 p-1', className)}
    >
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute bottom-1 left-1 top-1 rounded-lg bg-primary-500 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      />
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-[1] whitespace-nowrap rounded-lg text-center font-semibold transition-colors duration-200',
              size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isActive ? 'text-white' : 'text-text-muted hover:text-text-title',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
