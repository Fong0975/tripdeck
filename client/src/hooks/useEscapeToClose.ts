import { useEffect, useRef, type RefObject } from 'react';

type EscapeEntry = RefObject<() => void>;

/**
 * Open dialogs in mount order; the last entry is the top-most dialog. A
 * dialog opened on top of another always mounts (and therefore registers)
 * after it, so mount order matches visual stacking order.
 */
const stack: EscapeEntry[] = [];

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') {
    return;
  }
  stack[stack.length - 1]?.current();
}

/**
 * Calls `onEscape` when Escape is pressed, but only while the calling
 * dialog is the top-most one registered through this hook. This keeps a
 * single Escape press from closing a confirmation dialog and the modal
 * underneath it at the same time.
 *
 * The latest `onEscape` is always used, so callers may pass inline
 * callbacks without re-registering (and losing their stack position) on
 * every render.
 *
 * @param onEscape - Invoked when Escape is pressed while this dialog is on top.
 */
export function useEscapeToClose(onEscape: () => void): void {
  const callbackRef = useRef(onEscape);

  useEffect(() => {
    callbackRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const entry: EscapeEntry = callbackRef;
    if (stack.length === 0) {
      window.addEventListener('keydown', handleKeydown);
    }
    stack.push(entry);
    return () => {
      const index = stack.lastIndexOf(entry);
      if (index !== -1) {
        stack.splice(index, 1);
      }
      if (stack.length === 0) {
        window.removeEventListener('keydown', handleKeydown);
      }
    };
  }, []);
}
