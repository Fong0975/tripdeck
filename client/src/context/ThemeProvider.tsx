import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ThemeContext, type Theme } from './themeContext';

const THEME_KEY = 'tripdeck_theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

/**
 * Resolves the starting theme: a valid stored choice wins, otherwise the
 * system `prefers-color-scheme` setting decides. Unrecognized stored values
 * (e.g. hand-edited or left over from an older version) are ignored.
 */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (isTheme(stored)) {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Provides the app-wide color theme, applying it as the `dark` class on the
 * document root and persisting it to localStorage on every change.
 *
 * @param props.children - The subtree that can read the theme via `useTheme`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(
    () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
