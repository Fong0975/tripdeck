import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePointerSwipe } from './usePointerSwipe';

/** Minimal stand-in for a React pointer event, as the hook only reads these fields. */
function pointerEvent(clientX: number) {
  const setPointerCapture = vi.fn();
  return {
    event: {
      clientX,
      pointerId: 1,
      currentTarget: { setPointerCapture },
    } as unknown as React.PointerEvent<HTMLElement>,
    setPointerCapture,
  };
}

function setup(options: { enabled?: boolean; threshold?: number } = {}) {
  const onSwipeLeft = vi.fn();
  const onSwipeRight = vi.fn();
  const { result } = renderHook(() =>
    usePointerSwipe({
      enabled: options.enabled ?? true,
      onSwipeLeft,
      onSwipeRight,
      threshold: options.threshold,
    }),
  );
  return { handlers: result.current, onSwipeLeft, onSwipeRight };
}

describe('usePointerSwipe', () => {
  it.each([
    {
      description: 'a long leftward drag',
      startX: 200,
      endX: 100,
      left: 1,
      right: 0,
    },
    {
      description: 'a long rightward drag',
      startX: 100,
      endX: 200,
      left: 0,
      right: 1,
    },
    {
      description: 'a drag exactly at the threshold',
      startX: 200,
      endX: 150,
      left: 0,
      right: 0,
    },
    { description: 'a short drag', startX: 200, endX: 180, left: 0, right: 0 },
  ])(
    'reports $left left / $right right swipes for $description',
    ({ startX, endX, left, right }) => {
      const { handlers, onSwipeLeft, onSwipeRight } = setup();

      handlers.onPointerDown(pointerEvent(startX).event);
      handlers.onPointerUp(pointerEvent(endX).event);

      expect(onSwipeLeft).toHaveBeenCalledTimes(left);
      expect(onSwipeRight).toHaveBeenCalledTimes(right);
    },
  );

  it.each([
    { threshold: 10, endX: 185, swiped: true },
    { threshold: 30, endX: 185, swiped: false },
  ])(
    'honours a custom threshold of $threshold px (swiped: $swiped)',
    ({ threshold, endX, swiped }) => {
      const { handlers, onSwipeLeft } = setup({ threshold });

      handlers.onPointerDown(pointerEvent(200).event);
      handlers.onPointerUp(pointerEvent(endX).event);

      expect(onSwipeLeft).toHaveBeenCalledTimes(swiped ? 1 : 0);
    },
  );

  it.each([
    { enabled: true, captured: 1 },
    { enabled: false, captured: 0 },
  ])(
    'captures the pointer on press only when enabled is $enabled',
    ({ enabled, captured }) => {
      const { handlers, onSwipeLeft } = setup({ enabled });
      const down = pointerEvent(200);

      handlers.onPointerDown(down.event);
      handlers.onPointerUp(pointerEvent(0).event);

      expect(down.setPointerCapture).toHaveBeenCalledTimes(captured);
      expect(onSwipeLeft).toHaveBeenCalledTimes(captured);
    },
  );

  it.each([
    { description: 'a pointer cancel', cancel: true },
    { description: 'a completed swipe', cancel: false },
  ])('forgets the press after $description', ({ cancel }) => {
    const { handlers, onSwipeLeft } = setup();

    handlers.onPointerDown(pointerEvent(200).event);
    if (cancel) {
      handlers.onPointerCancel();
    } else {
      handlers.onPointerUp(pointerEvent(0).event);
    }
    handlers.onPointerUp(pointerEvent(0).event);

    expect(onSwipeLeft).toHaveBeenCalledTimes(cancel ? 0 : 1);
  });
});
