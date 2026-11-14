import { useCallback, useRef, useState } from 'react';

/**
 * Guards an async action (typically a form submit) against being triggered
 * again while a previous run is still in flight.
 *
 * A ref backs the guard so that two clicks dispatched before React re-renders
 * are still deduplicated; the `submitting` state mirrors it for rendering
 * (e.g. disabling the submit button).
 *
 * @returns `submitting` — true while a run is in flight; `run` — invokes the
 *   given async function unless another run is in flight (in which case the
 *   call is ignored and resolves immediately). The flag is always reset when
 *   the function settles, and any rejection is propagated to the caller.
 */
export function useSubmitting() {
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown> | unknown): Promise<void> => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      setSubmitting(true);
      try {
        await fn();
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitting, run };
}
