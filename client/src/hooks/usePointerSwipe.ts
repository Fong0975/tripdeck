import { useRef } from 'react';

/** Minimum horizontal travel, in pixels, for a drag to count as a swipe. */
export const DEFAULT_SWIPE_THRESHOLD = 50;

interface UsePointerSwipeOptions {
  /** When false, pointer presses are ignored and no swipe is reported. */
  enabled: boolean;
  /** Called when the pointer is released after dragging left past the threshold. */
  onSwipeLeft: () => void;
  /** Called when the pointer is released after dragging right past the threshold. */
  onSwipeRight: () => void;
  /** Minimum horizontal travel in pixels; defaults to {@link DEFAULT_SWIPE_THRESHOLD}. */
  threshold?: number;
}

/** Pointer handlers to spread onto the swipeable element. */
export interface PointerSwipeHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
}

/**
 * Detects horizontal swipe gestures with pointer events, so mouse drags and
 * touch swipes share one code path. The pointer is captured on press so the
 * release is still observed when it ends outside the element.
 *
 * @param options - Swipe callbacks, threshold and enable flag.
 * @returns Pointer event handlers for the swipeable element.
 */
export function usePointerSwipe({
  enabled,
  onSwipeLeft,
  onSwipeRight,
  threshold = DEFAULT_SWIPE_THRESHOLD,
}: UsePointerSwipeOptions): PointerSwipeHandlers {
  const startX = useRef<number | null>(null);

  return {
    onPointerDown: e => {
      if (!enabled) {
        return;
      }
      startX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerUp: e => {
      if (startX.current === null) {
        return;
      }
      const delta = e.clientX - startX.current;
      startX.current = null;
      if (delta < -threshold) {
        onSwipeLeft();
      } else if (delta > threshold) {
        onSwipeRight();
      }
    },
    onPointerCancel: () => {
      startX.current = null;
    },
  };
}
