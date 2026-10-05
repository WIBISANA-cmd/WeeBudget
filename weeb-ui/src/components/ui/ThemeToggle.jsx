import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/useTheme';
import { cn } from '../../lib/utils';

export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors duration-150',
        'hover:bg-hover-soft hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className,
      )}
    >
      <Sun className={cn('absolute h-[18px] w-[18px] transition-all duration-200', isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Moon className={cn('absolute h-[18px] w-[18px] transition-all duration-200', isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </button>
  );
}
