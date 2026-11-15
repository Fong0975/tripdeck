import { useContext } from 'react';

import { ThemeContext } from '@/context/themeContext';

/**
 * Reads the current color theme and its toggle from the nearest
 * `ThemeProvider`.
 *
 * @returns The active `theme` and a `toggle` that flips light/dark.
 */
export const useTheme = () => useContext(ThemeContext);
