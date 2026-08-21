import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReferenceWebsite } from '@/types';

import ReferenceWebsitesEditor from './ReferenceWebsitesEditor';

function makeJsonResponse(body: unknown): Response {
  return { json: () => Promise.resolve(body) } as unknown as Response;
}

const getAddButton = (): HTMLElement => {
  const buttons = screen.getAllByRole('button');
  return buttons[buttons.length - 1];
};

// Each rendered website row contributes one trash button, in the same order
// as the websites array, ahead of the add-website controls — so the row's
// index into the full button list identifies its trash button.
const getTrashButton = (index: number): HTMLElement =>
  screen.getAllByRole('button')[index];

const getSuggestionButton = (): HTMLElement =>
  screen.getByTitle(/正在取得網頁標題|無法取得網頁標題|^帶入/);

describe('ReferenceWebsitesEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders websites as links and removes one on trash click', () => {
    const websites: ReferenceWebsite[] = [
      { url: 'https://a.example.com', title: 'Site A' },
      { url: 'https://b.example.com', title: 'Site B' },
    ];
    const onChange = vi.fn();
    render(<ReferenceWebsitesEditor websites={websites} onChange={onChange} />);

    expect(screen.getByRole('link', { name: 'Site A' })).toHaveAttribute(
      'href',
      'https://a.example.com',
    );
    expect(screen.getByRole('link', { name: 'Site B' })).toHaveAttribute(
      'href',
      'https://b.example.com',
    );

    fireEvent.click(getTrashButton(0));

    expect(onChange).toHaveBeenCalledWith([websites[1]]);
  });

  it('falls back to the URL when a website has no title', () => {
    const websites: ReferenceWebsite[] = [
      { url: 'https://a.example.com', title: '' },
    ];
    render(<ReferenceWebsitesEditor websites={websites} onChange={vi.fn()} />);

    expect(
      screen.getByRole('link', { name: 'https://a.example.com' }),
    ).toBeInTheDocument();
  });

  it.each([
    { description: 'clicking the add button', submit: 'click' as const },
    {
      description: 'pressing Enter in the title field',
      submit: 'enter' as const,
    },
  ])('adds a website and clears the inputs when $description', ({ submit }) => {
    const onChange = vi.fn();
    render(<ReferenceWebsitesEditor websites={[]} onChange={onChange} />);

    const urlInput = screen.getByPlaceholderText('https://...');
    const titleInput = screen.getByPlaceholderText('標題 *');
    fireEvent.change(urlInput, {
      target: { value: 'https://c.example.com' },
    });
    fireEvent.change(titleInput, { target: { value: 'Site C' } });

    if (submit === 'click') {
      fireEvent.click(getAddButton());
    } else {
      fireEvent.keyDown(titleInput, { key: 'Enter' });
    }

    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://c.example.com', title: 'Site C' },
    ]);
    expect(urlInput).toHaveValue('');
    expect(titleInput).toHaveValue('');
  });

  it.each([
    { description: 'the url is empty', url: '', title: 'Site C' },
    {
      description: 'the title is empty',
      url: 'https://c.example.com',
      title: '',
    },
    { description: 'the url is whitespace-only', url: '   ', title: 'Site C' },
    {
      description: 'the title is whitespace-only',
      url: 'https://c.example.com',
      title: '   ',
    },
  ])('does not call onChange when $description', ({ url, title }) => {
    const onChange = vi.fn();
    render(<ReferenceWebsitesEditor websites={[]} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: url },
    });
    fireEvent.change(screen.getByPlaceholderText('標題 *'), {
      target: { value: title },
    });
    fireEvent.click(getAddButton());

    expect(onChange).not.toHaveBeenCalled();
  });

  // Debounced title-suggestion fetch — a sequential timer/promise state
  // machine, so each step is its own test rather than a shared it.each.
  it('does not call fetch immediately after the URL changes', () => {
    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch after the debounce elapses and enables suggestion when found', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeJsonResponse({ title: 'Some Title' }),
    );

    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('https://c.example.com')),
        expect.objectContaining({ signal: expect.anything() }),
      );
    });

    await vi.waitFor(() => {
      expect(getSuggestionButton()).toBeEnabled();
    });
  });

  it('marks not found when the fetched title is null', async () => {
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ title: null }));

    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(getSuggestionButton()).toBeDisabled();
    });
  });

  it('marks the suggestion as not found when fetch rejects', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));

    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(getSuggestionButton()).toBeDisabled();
    });
  });

  it('shows the loading message while the title fetch is pending', () => {
    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    expect(getSuggestionButton()).toHaveAttribute(
      'title',
      '正在取得網頁標題...',
    );
  });

  it.each([
    {
      description: 'the fetched title is null',
      mockFetch: () =>
        vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ title: null })),
    },
    {
      description: 'fetch rejects',
      mockFetch: () =>
        vi.mocked(fetch).mockRejectedValue(new Error('network error')),
    },
  ])('shows the not-found message when $description', async ({ mockFetch }) => {
    mockFetch();

    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(getSuggestionButton()).toHaveAttribute(
        'title',
        '無法取得網頁標題',
      );
    });
  });

  it('fills the title input with the suggested title on click', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeJsonResponse({ title: 'Suggested Title' }),
    );

    render(<ReferenceWebsitesEditor websites={[]} onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://c.example.com' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.waitFor(() => {
      expect(getSuggestionButton()).toBeEnabled();
    });

    fireEvent.click(getSuggestionButton());

    expect(screen.getByPlaceholderText('標題 *')).toHaveValue(
      'Suggested Title',
    );
  });
});
