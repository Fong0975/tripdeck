import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from '@/hooks/useTheme';

import { ThemeContext } from './ThemeContext.ts';
import { ThemeProvider } from './ThemeContext.tsx';

function TestConsumer() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <span data-testid='theme'>{theme}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

function RawContextConsumer() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <div>
      <span data-testid='theme'>{theme}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ThemeContext.ts only declares the context object + its default value —
// covered here directly, separately from ThemeProvider's own behavior below.
describe('ThemeContext default value', () => {
  it('defaults to the light theme when rendered without a provider', () => {
    render(<RawContextConsumer />);

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('defaults toggle to a no-op when rendered without a provider', async () => {
    const user = userEvent.setup();
    render(<RawContextConsumer />);

    await expect(
      user.click(screen.getByRole('button')),
    ).resolves.toBeUndefined();
  });
});

describe('ThemeProvider', () => {
  it.each([
    {
      description: 'a theme is stored',
      stored: 'dark',
      systemPrefersDark: false,
      expected: 'dark',
    },
    {
      description: 'no theme is stored and the system prefers dark',
      stored: null,
      systemPrefersDark: true,
      expected: 'dark',
    },
    {
      description: 'no theme is stored and the system prefers light',
      stored: null,
      systemPrefersDark: false,
      expected: 'light',
    },
    {
      description: 'a stored theme overrides the system preference',
      stored: 'light',
      systemPrefersDark: true,
      expected: 'light',
    },
  ])(
    'resolves to $expected when $description',
    ({ stored, systemPrefersDark, expected }) => {
      if (stored) {
        localStorage.setItem('tripdeck_theme', stored);
      }
      mockMatchMedia(systemPrefersDark);

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme')).toHaveTextContent(expected);
      if (expected === 'dark') {
        expect(document.documentElement).toHaveClass('dark');
      } else {
        expect(document.documentElement).not.toHaveClass('dark');
      }
    },
  );

  it('flips the theme and persists it to storage when toggle is called', async () => {
    localStorage.setItem('tripdeck_theme', 'light');
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    await user.click(screen.getByRole('button'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem('tripdeck_theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('flips the theme from dark to light when toggle is called', async () => {
    localStorage.setItem('tripdeck_theme', 'dark');
    mockMatchMedia(true);
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    await user.click(screen.getByRole('button'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.getItem('tripdeck_theme')).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
