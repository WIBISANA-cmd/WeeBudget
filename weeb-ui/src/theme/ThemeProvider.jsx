import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'weeb_theme';
const THEMES = ['light', 'dark'];

const ThemeContext = createContext(null);

/**
 * Time-based theme: night (18:30–05:59) → dark, else → light.
 * Replaces system preference detection to stay in sync with the Navbar sky logic.
 */
function getTimeBasedTheme() {
  if (typeof window === 'undefined') return 'light';

  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  // Night: 18:30 (1110) → 05:59 (359)
  return (totalMin >= 1110 || totalMin < 360) ? 'dark' : 'light';
}

function getStoredTheme() {
  if (typeof window === 'undefined') return null;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.includes(storedTheme) ? storedTheme : null;
}

function resolveInitialTheme() {
  return getStoredTheme() || getTimeBasedTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0a0a0a' : '#08a0ff');

  // Night mode body background per design spec
  document.body.style.backgroundColor = isDark ? '#0a0a0a' : '';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);
  const [isAutoTheme, setAutoTheme] = useState(() => !getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Re-sync time-based theme every 60 s when in auto mode
  useEffect(() => {
    if (!isAutoTheme) return undefined;

    const sync = () => setThemeState(getTimeBasedTheme());
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, [isAutoTheme]);

  const setTheme = useCallback((nextTheme) => {
    if (!THEMES.includes(nextTheme)) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setAutoTheme(false);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const resetToAutoTheme = useCallback(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    setAutoTheme(true);
    setThemeState(getTimeBasedTheme());
  }, []);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isAutoTheme,
    setTheme,
    toggleTheme,
    resetToAutoTheme,
  }), [isAutoTheme, resetToAutoTheme, setTheme, theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext, THEME_STORAGE_KEY };
