import { useState, useEffect, type ReactNode } from 'react';

import { ThemeContext, type Theme } from './ThemeContext.ts';

const THEME_KEY = 'tripdeck_theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored) {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
