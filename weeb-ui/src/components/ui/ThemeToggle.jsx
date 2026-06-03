import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/useTheme';
import { cn } from '../../lib/utils';

export default function ThemeToggle({ className, showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
      title={isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
      className={cn(
        'group inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel px-2 text-sm font-semibold text-text-muted shadow-sm shadow-card-soft transition-all duration-200',
        'hover:border-border-strong hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
        showLabel ? 'pr-3' : 'w-10 justify-center',
        className,
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-primary-500/10 text-primary-600">
        <Sun className={cn('absolute h-4 w-4 transition-all duration-200', isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
        <Moon className={cn('absolute h-4 w-4 transition-all duration-200', isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
      </span>
      {showLabel && <span>{isDark ? 'Dark' : 'Light'}</span>}
    </button>
  );
}
