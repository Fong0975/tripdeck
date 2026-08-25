import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from '@/hooks/useTheme';

import Navbar from './Navbar';

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

function makeFetchResponse(body: unknown): Response {
  return { json: () => Promise.resolve(body) } as unknown as Response;
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggle: vi.fn() });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(makeFetchResponse({ version: '9.9.9' })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Navbar', () => {
  it('renders the brand link to the home page', async () => {
    renderNavbar();

    await screen.findByText('Tripdeck');

    expect(screen.getByRole('link', { name: /Tripdeck/ })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it.each([
    { theme: 'light' as const, expectedClass: 'lucide-moon' },
    { theme: 'dark' as const, expectedClass: 'lucide-sun' },
  ])(
    'shows the $expectedClass icon when the theme is $theme',
    async ({ theme, expectedClass }) => {
      vi.mocked(useTheme).mockReturnValue({ theme, toggle: vi.fn() });
      const { container } = renderNavbar();
      await screen.findByText('Tripdeck');

      // The lucide icon is a purely decorative <svg> with no accessible
      // role/name — only its class name distinguishes sun from moon.
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      expect(container.querySelector(`.${expectedClass}`)).toBeInTheDocument();
    },
  );

  it('calls toggle when the theme button is clicked', async () => {
    const toggle = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggle });
    const user = userEvent.setup();
    renderNavbar();
    await screen.findByText('Tripdeck');

    await user.click(screen.getByLabelText('切換主題'));

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('shows the fetched API version once it resolves', async () => {
    renderNavbar();

    expect(await screen.findByText('(API v9.9.9)')).toBeInTheDocument();
  });

  it('does not show an API version when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error')),
    );
    renderNavbar();

    await screen.findByText('Tripdeck');

    expect(screen.queryByText(/API v/)).not.toBeInTheDocument();
  });

  it('links to the GitHub repository from the info panel', async () => {
    renderNavbar();
    await screen.findByText('Tripdeck');

    expect(screen.getByRole('menuitem', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/Fong0975/tripdeck',
    );
  });
});
