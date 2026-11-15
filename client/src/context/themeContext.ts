import { createContext } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

/**
 * Holds the active color theme and its toggle. Defaults to a light theme with
 * a no-op toggle when no `ThemeProvider` is mounted.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
});
