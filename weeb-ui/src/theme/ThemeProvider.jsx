import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'weeb_theme';
const THEMES = ['light', 'dark'];

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme() {
  if (typeof window === 'undefined') return null;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.includes(storedTheme) ? storedTheme : null;
}

function resolveInitialTheme() {
  return getStoredTheme() || getSystemTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0F172A' : '#08a0ff');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);
  const [isSystemTheme, setSystemTheme] = useState(() => !getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isSystemTheme) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setThemeState(event.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemTheme]);

  const setTheme = useCallback((nextTheme) => {
    if (!THEMES.includes(nextTheme)) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setSystemTheme(false);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const resetToSystemTheme = useCallback(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    setSystemTheme(true);
    setThemeState(getSystemTheme());
  }, []);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isSystemTheme,
    setTheme,
    toggleTheme,
    resetToSystemTheme,
  }), [isSystemTheme, resetToSystemTheme, setTheme, theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext, THEME_STORAGE_KEY };
