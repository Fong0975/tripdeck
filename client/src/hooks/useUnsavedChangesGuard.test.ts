import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

function firePopstate() {
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Stateful navigation-guard hook — deliberately not table-driven: each case
// exercises a different point in the same effect/listener lifecycle, so a
// shared it.each would obscure the assertions (same rationale as
// useConfirmDelete.test.ts).
describe('useUnsavedChangesGuard', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState');
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
  });

  it('does not push history state while isDirty is false', () => {
    renderHook(() => useUnsavedChangesGuard(false, vi.fn()));

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('pushes a history state when isDirty is true', () => {
    renderHook(() => useUnsavedChangesGuard(true, vi.fn()));

    expect(pushStateSpy).toHaveBeenCalledWith(null, '');
  });

  it('shows the leave confirmation and re-pushes state on popstate while dirty', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true, vi.fn()));
    pushStateSpy.mockClear();

    act(() => firePopstate());

    expect(result.current.showLeaveConfirm).toBe(true);
    expect(pushStateSpy).toHaveBeenCalledWith(null, '');
  });

  it('ignores popstate while not dirty', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(false, vi.fn()));

    act(() => firePopstate());

    expect(result.current.showLeaveConfirm).toBe(false);
  });

  it('calls onLeave immediately from guardedLeave when not dirty', () => {
    const onLeave = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard(false, onLeave));

    act(() => result.current.guardedLeave());

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(result.current.showLeaveConfirm).toBe(false);
  });

  it('shows the confirmation instead of leaving when dirty', () => {
    const onLeave = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard(true, onLeave));

    act(() => result.current.guardedLeave());

    expect(onLeave).not.toHaveBeenCalled();
    expect(result.current.showLeaveConfirm).toBe(true);
  });

  it('confirmLeave hides the confirmation and calls onLeave', () => {
    const onLeave = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard(true, onLeave));
    act(() => result.current.guardedLeave());

    act(() => result.current.confirmLeave());

    expect(result.current.showLeaveConfirm).toBe(false);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('cancelLeave hides the confirmation without calling onLeave', () => {
    const onLeave = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard(true, onLeave));
    act(() => result.current.guardedLeave());

    act(() => result.current.cancelLeave());

    expect(result.current.showLeaveConfirm).toBe(false);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('stops reacting to popstate once isDirty becomes false', () => {
    const { result, rerender } = renderHook(
      ({ isDirty }) => useUnsavedChangesGuard(isDirty, vi.fn()),
      { initialProps: { isDirty: true } },
    );

    rerender({ isDirty: false });
    act(() => firePopstate());

    expect(result.current.showLeaveConfirm).toBe(false);
  });
});
