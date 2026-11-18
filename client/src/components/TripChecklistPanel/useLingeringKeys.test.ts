import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLingeringKeys } from './useLingeringKeys';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLingeringKeys', () => {
  it('holds a key until the delay has passed', () => {
    const { result } = renderHook(() => useLingeringKeys(3000));

    act(() => result.current.hold('a'));
    expect(result.current.keys.has('a')).toBe(true);

    act(() => vi.advanceTimersByTime(2999));
    expect(result.current.keys.has('a')).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.keys.has('a')).toBe(false);
  });

  it('restarts the timer when a key is held again', () => {
    const { result } = renderHook(() => useLingeringKeys(3000));
    act(() => result.current.hold('a'));
    act(() => vi.advanceTimersByTime(2000));

    act(() => result.current.hold('a'));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.keys.has('a')).toBe(true);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.keys.has('a')).toBe(false);
  });

  it('releases a key at once and stops its timer', () => {
    const { result } = renderHook(() => useLingeringKeys(3000));
    act(() => result.current.hold('a'));

    act(() => result.current.release('a'));
    expect(result.current.keys.has('a')).toBe(false);

    act(() => result.current.hold('b'));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.keys.size).toBe(0);
  });

  it('keeps other keys when one is released', () => {
    const { result } = renderHook(() => useLingeringKeys(3000));
    act(() => {
      result.current.hold('a');
      result.current.hold('b');
    });

    act(() => result.current.release('a'));

    expect([...result.current.keys]).toEqual(['b']);
  });

  it('keeps the same set when an unknown key is released', () => {
    const { result } = renderHook(() => useLingeringKeys(3000));
    const before = result.current.keys;

    act(() => result.current.release('missing'));

    expect(result.current.keys).toBe(before);
  });

  it('stops timers on unmount', () => {
    const { result, unmount } = renderHook(() => useLingeringKeys(3000));
    act(() => result.current.hold('a'));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
