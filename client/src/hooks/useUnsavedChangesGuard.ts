import { useEffect, useState } from 'react';

/**
 * Guards navigation away from the current page while `isDirty` is true:
 * intercepts the browser back button to show a confirmation instead of
 * leaving immediately, and exposes a `guardedLeave` wrapper for in-app
 * "back"-style actions to use the same confirmation.
 */
export function useUnsavedChangesGuard(isDirty: boolean, onLeave: () => void) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    window.history.pushState(null, '');
    const onPopstate = () => {
      window.history.pushState(null, '');
      setShowLeaveConfirm(true);
    };
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, [isDirty]);

  const guardedLeave = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      onLeave();
    }
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    onLeave();
  };

  const cancelLeave = () => setShowLeaveConfirm(false);

  return { showLeaveConfirm, guardedLeave, confirmLeave, cancelLeave };
}
