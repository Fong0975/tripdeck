import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether a line-clamped text block is actually being clipped, and
 * whether the user has expanded it — used to conditionally show a
 * "展開/收起" toggle only when clamping actually occurs.
 */
export function useClampedText(text: string | null | undefined) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight);
    }
  }, [text]);

  const toggle = () => setExpanded(prev => !prev);

  return { ref, expanded, clamped, toggle };
}
