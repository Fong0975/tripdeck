import { useEffect } from 'react';

import { useConfirmLeave } from './useConfirmLeave';

const SENTINEL_KEY = '__unsavedChangesGuard';

function isSentinelEntry(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>)[SENTINEL_KEY] === true
  );
}

function ensureSentinel() {
  if (!isSentinelEntry(window.history.state)) {
    window.history.pushState({ [SENTINEL_KEY]: true }, '');
  }
}

/**
 * Guards navigation away from the current page while `isDirty` is true:
 * intercepts the browser back button to show a confirmation instead of
 * leaving immediately, warns on reload/tab close via `beforeunload`, and
 * exposes a `guardedLeave` wrapper for in-app "back"-style actions to use
 * the same confirmation.
 *
 * Back-button interception relies on a single sentinel history entry that
 * exists only while dirty: it is pushed once when the page becomes dirty
 * (and not again if it is already the current entry) and popped when the
 * page becomes clean, so no stray entries are left for Back to step through.
 *
 * @param isDirty - Whether the page has unsaved changes.
 * @param onLeave - Performs the actual navigation away.
 */
export function useUnsavedChangesGuard(isDirty: boolean, onLeave: () => void) {
  const {
    showLeaveConfirm,
    guardedLeave,
    requestLeaveConfirm,
    confirmLeave,
    cancelLeave,
  } = useConfirmLeave(isDirty, onLeave);

  useEffect(() => {
    if (!isDirty) {
      // Listeners are already detached here, so the popstate this triggers
      // is not mistaken for the user pressing Back.
      if (isSentinelEntry(window.history.state)) {
        window.history.back();
      }
      return;
    }

    ensureSentinel();
    const onPopstate = () => {
      ensureSentinel();
      requestLeaveConfirm();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('popstate', onPopstate);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopstate);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, requestLeaveConfirm]);

  return { showLeaveConfirm, guardedLeave, confirmLeave, cancelLeave };
}
