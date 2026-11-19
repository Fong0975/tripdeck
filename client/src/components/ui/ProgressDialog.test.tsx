import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProgressDialog from './ProgressDialog';

describe('ProgressDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    {
      description: 'before the delay has elapsed',
      advanceMs: 399,
      shown: false,
    },
    { description: 'once the delay has elapsed', advanceMs: 400, shown: true },
  ])('is shown=$shown $description while open', ({ advanceMs, shown }) => {
    render(<ProgressDialog open message='處理中' />);

    act(() => {
      vi.advanceTimersByTime(advanceMs);
    });

    if (shown) {
      expect(screen.getByRole('status')).toHaveTextContent('處理中');
    } else {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    }
  });

  it('honours a custom delay', () => {
    render(<ProgressDialog open message='處理中' delayMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('never appears when closed before the delay elapses', () => {
    const { rerender } = render(<ProgressDialog open message='處理中' />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender(<ProgressDialog open={false} message='處理中' />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disappears when closed after being shown and waits again when reopened', () => {
    const { rerender } = render(<ProgressDialog open message='處理中' />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<ProgressDialog open={false} message='處理中' />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<ProgressDialog open message='處理中' />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
