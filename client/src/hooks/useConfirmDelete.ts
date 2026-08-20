import { useState } from 'react';

/**
 * Two-step "click to arm, click again to confirm" delete pattern: the first
 * click arms confirmation for `timeoutMs`, and a second click within that
 * window calls onConfirm. The arm state auto-resets after the timeout.
 */
export function useConfirmDelete(onConfirm: () => void, timeoutMs = 3000) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onConfirm();
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), timeoutMs);
    }
  };

  return { confirming, handleClick };
}
