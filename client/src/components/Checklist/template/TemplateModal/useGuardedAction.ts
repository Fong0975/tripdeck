import { useState } from 'react';

/**
 * Defers a destructive action behind a confirmation while there are unsaved
 * changes.
 *
 * @param isDirty - Whether running an action would discard unsaved changes.
 * @returns `guard` (runs the action now when clean, otherwise asks first),
 *   `showConfirm` (render a confirmation while true), and `confirm` /
 *   `cancel` for the confirmation's two buttons.
 */
export function useGuardedAction(isDirty: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null);

  const guard = (action: () => void) => {
    if (isDirty) {
      setPending(() => action);
    } else {
      action();
    }
  };

  const confirm = () => {
    const action = pending;
    setPending(null);
    action?.();
  };

  const cancel = () => setPending(null);

  return { guard, showConfirm: pending !== null, confirm, cancel };
}
