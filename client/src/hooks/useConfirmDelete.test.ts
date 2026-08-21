import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useConfirmDelete } from './useConfirmDelete';

function makeEvent() {
  return { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
}

// Stateful two-click confirm/timeout machine — deliberately not table-driven
// (see the plan's Phase 3 notes): each case exercises a different point in
// the same timer sequence, so a shared it.each would obscure the assertions.
describe('useConfirmDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls stopPropagation on every click', () => {
    const { result } = renderHook(() => useConfirmDelete(vi.fn()));
    const event = makeEvent();

    act(() => {
      result.current.handleClick(event);
    });

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('arms confirmation on the first click without calling onConfirm', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmDelete(onConfirm));

    act(() => {
      result.current.handleClick(makeEvent());
    });

    expect(result.current.confirming).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm on a second click within the timeout window', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmDelete(onConfirm, 3000));

    act(() => {
      result.current.handleClick(makeEvent());
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.handleClick(makeEvent());
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('resets confirmation state after the timeout elapses', () => {
    const { result } = renderHook(() => useConfirmDelete(vi.fn(), 3000));

    act(() => {
      result.current.handleClick(makeEvent());
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.confirming).toBe(false);
  });

  it('requires a fresh confirmation window after the timeout re-arms', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmDelete(onConfirm, 3000));

    act(() => {
      result.current.handleClick(makeEvent());
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.handleClick(makeEvent());
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(result.current.confirming).toBe(true);
  });

  it('respects a custom timeoutMs value', () => {
    const { result } = renderHook(() => useConfirmDelete(vi.fn(), 500));

    act(() => {
      result.current.handleClick(makeEvent());
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.confirming).toBe(false);
  });
});
