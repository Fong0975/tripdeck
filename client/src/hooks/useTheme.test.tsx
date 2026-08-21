import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeContext } from '@/context/ThemeContext.ts';

import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('returns the default context value when no provider is present', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(typeof result.current.toggle).toBe('function');
  });

  it('returns the value provided by an ancestor ThemeContext.Provider', () => {
    const toggle = vi.fn();
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeContext.Provider value={{ theme: 'dark', toggle }}>
          {children}
        </ThemeContext.Provider>
      ),
    });

    expect(result.current).toEqual({ theme: 'dark', toggle });
  });
});
