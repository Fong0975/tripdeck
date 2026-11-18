import { useCallback, useEffect, useRef, useState } from 'react';

/** Keys currently held, with the actions that change them. */
export interface LingeringKeys {
  keys: ReadonlySet<string>;
  /** Holds a key and (re)starts its timer; it is released when it expires. */
  hold: (key: string) => void;
  /** Releases a key and stops its timer. */
  release: (key: string) => void;
}

/**
 * Holds keys for a limited time. Each key is released by itself once `delayMs`
 * passed since it was last held; all timers are stopped on unmount.
 *
 * @param delayMs - How long a key stays held.
 */
export function useLingeringKeys(delayMs: number): LingeringKeys {
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const release = useCallback((key: string) => {
    const timer = timers.current.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(key);
    }
    setKeys(current => {
      if (!current.has(key)) {
        return current;
      }
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const hold = useCallback(
    (key: string) => {
      const previous = timers.current.get(key);
      if (previous !== undefined) {
        clearTimeout(previous);
      }
      timers.current.set(
        key,
        setTimeout(() => release(key), delayMs),
      );
      setKeys(current => new Set(current).add(key));
    },
    [delayMs, release],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  return { keys, hold, release };
}
