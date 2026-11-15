import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

const SENTINEL_STATE = { __unsavedChangesGuard: true };

function firePopstate() {
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function fireBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

function renderGuard(initialDirty: boolean, onLeave = vi.fn()) {
  return renderHook(({ isDirty }) => useUnsavedChangesGuard(isDirty, onLeave), {
    initialProps: { isDirty: initialDirty },
  });
}

// Stateful navigation-guard hook — mostly not table-driven: each case
// exercises a different point in the same effect/listener lifecycle, so a
// shared it.each would obscure the assertions. The confirmation state
// machine itself is covered by useConfirmLeave.test.ts.
describe('useUnsavedChangesGuard', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState(null, '');
    pushStateSpy = vi.spyOn(window.history, 'pushState');
    // jsdom traverses history asynchronously; popping synchronously keeps
    // the "current entry" observable within a single test step.
    backSpy = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => window.history.replaceState(null, ''));
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    backSpy.mockRestore();
    window.history.replaceState(null, '');
  });

  it('neither pushes nor pops history while clean', () => {
    renderGuard(false);

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('pushes a single sentinel entry when it becomes dirty', () => {
    const { rerender } = renderGuard(true);
    rerender({ isDirty: true });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(window.history.state).toEqual(SENTINEL_STATE);
  });

  it('does not push again when the sentinel is already the current entry', () => {
    window.history.replaceState(SENTINEL_STATE, '');

    renderGuard(true);

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('pops the sentinel when it becomes clean, and re-pushes only once per dirty period', () => {
    const { rerender } = renderGuard(true);

    rerender({ isDirty: false });
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(window.history.state).toBeNull();

    rerender({ isDirty: true });
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
  });

  it('shows the leave confirmation and re-arms the sentinel on popstate while dirty', () => {
    const { result } = renderGuard(true);
    pushStateSpy.mockClear();
    // Pressing Back leaves the sentinel for the entry below it.
    window.history.replaceState(null, '');

    act(() => firePopstate());

    expect(result.current.showLeaveConfirm).toBe(true);
    expect(pushStateSpy).toHaveBeenCalledWith(SENTINEL_STATE, '');
  });

  it.each([
    { description: 'clean from the start', initialDirty: false },
    { description: 'dirty and then clean', initialDirty: true },
  ])('ignores popstate while $description', ({ initialDirty }) => {
    const { result, rerender } = renderGuard(initialDirty);
    rerender({ isDirty: false });

    act(() => firePopstate());

    expect(result.current.showLeaveConfirm).toBe(false);
  });

  it.each([
    { isDirty: true, expectedPrevented: true },
    { isDirty: false, expectedPrevented: false },
  ])(
    'prevents beforeunload: $expectedPrevented when isDirty is $isDirty',
    ({ isDirty, expectedPrevented }) => {
      renderGuard(isDirty);

      expect(fireBeforeUnload().defaultPrevented).toBe(expectedPrevented);
    },
  );

  it('stops preventing beforeunload once it becomes clean', () => {
    const { rerender } = renderGuard(true);

    rerender({ isDirty: false });

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('routes guardedLeave through the confirmation while dirty', () => {
    const onLeave = vi.fn();
    const { result } = renderGuard(true, onLeave);

    act(() => result.current.guardedLeave());
    expect(result.current.showLeaveConfirm).toBe(true);
    expect(onLeave).not.toHaveBeenCalled();

    act(() => result.current.confirmLeave());
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
