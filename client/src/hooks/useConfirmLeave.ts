import { useCallback, useState } from 'react';

/**
 * Confirmation state for leaving something (a page or a dialog) that may
 * hold unsaved changes.
 *
 * @param isDirty - Whether there are unsaved changes that leaving would discard.
 * @param onLeave - Performs the actual leave.
 * @returns `showLeaveConfirm` (render a confirmation while true),
 *   `guardedLeave` (leave now when clean, otherwise ask first),
 *   `requestLeaveConfirm` (ask unconditionally; referentially stable),
 *   and `confirmLeave` / `cancelLeave` for the confirmation's two buttons.
 */
export function useConfirmLeave(isDirty: boolean, onLeave: () => void) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const requestLeaveConfirm = useCallback(() => setShowLeaveConfirm(true), []);

  const guardedLeave = () => {
    if (isDirty) {
      requestLeaveConfirm();
    } else {
      onLeave();
    }
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    onLeave();
  };

  const cancelLeave = () => setShowLeaveConfirm(false);

  return {
    showLeaveConfirm,
    guardedLeave,
    requestLeaveConfirm,
    confirmLeave,
    cancelLeave,
  };
}
