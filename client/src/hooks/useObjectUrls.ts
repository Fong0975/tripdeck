import { useCallback, useEffect, useRef } from 'react';

/**
 * Creates `blob:` object URLs for local previews and guarantees each one is
 * released: either explicitly via `revoke`, or automatically on unmount.
 *
 * Live URLs are tracked in a ref rather than state so the unmount cleanup
 * always sees the latest set, instead of a stale snapshot captured when the
 * effect was first registered.
 *
 * @returns `create` — makes a tracked object URL for a blob/file; `revoke` —
 *   releases a URL early and stops tracking it.
 */
export function useObjectUrls() {
  const liveUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const liveUrls = liveUrlsRef.current;
    return () => {
      liveUrls.forEach(url => URL.revokeObjectURL(url));
      liveUrls.clear();
    };
  }, []);

  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    liveUrlsRef.current.add(url);
    return url;
  }, []);

  const revoke = useCallback((url: string): void => {
    URL.revokeObjectURL(url);
    liveUrlsRef.current.delete(url);
  }, []);

  return { create, revoke };
}
