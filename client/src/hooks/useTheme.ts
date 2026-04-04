import { useContext } from 'react';

import { ThemeContext } from '@/context/ThemeContext.ts';

export const useTheme = () => useContext(ThemeContext);
