import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGuardedAction } from './useGuardedAction';

describe('useGuardedAction', () => {
  it.each([
    { description: 'is clean', isDirty: false, runsImmediately: true },
    { description: 'is dirty', isDirty: true, runsImmediately: false },
  ])(
    'when $description, runsImmediately=$runsImmediately',
    ({ isDirty, runsImmediately }) => {
      const action = vi.fn();
      const { result } = renderHook(() => useGuardedAction(isDirty));

      act(() => result.current.guard(action));

      expect(action).toHaveBeenCalledTimes(runsImmediately ? 1 : 0);
      expect(result.current.showConfirm).toBe(!runsImmediately);
    },
  );

  it('runs the pending action and hides the confirmation on confirm', () => {
    const action = vi.fn();
    const { result } = renderHook(() => useGuardedAction(true));
    act(() => result.current.guard(action));

    act(() => result.current.confirm());

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.showConfirm).toBe(false);
  });

  it('drops the pending action and hides the confirmation on cancel', () => {
    const action = vi.fn();
    const { result } = renderHook(() => useGuardedAction(true));
    act(() => result.current.guard(action));

    act(() => result.current.cancel());

    expect(action).not.toHaveBeenCalled();
    expect(result.current.showConfirm).toBe(false);
  });

  it('does nothing when confirm is called without a pending action', () => {
    const { result } = renderHook(() => useGuardedAction(true));

    expect(() => act(() => result.current.confirm())).not.toThrow();
    expect(result.current.showConfirm).toBe(false);
  });
});
