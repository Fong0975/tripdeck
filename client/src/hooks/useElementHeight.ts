import { type RefObject, useLayoutEffect, useState } from 'react';

/**
 * Tracks the rendered height of an element, updating when it resizes.
 *
 * @param ref - Ref attached to the element to measure.
 * @returns The element's height in pixels; 0 until it is measured or when
 *   `ResizeObserver` is unavailable.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setHeight(el.getBoundingClientRect().height);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      setHeight(el.getBoundingClientRect().height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}
