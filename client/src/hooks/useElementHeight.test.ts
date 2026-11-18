import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useElementHeight } from './useElementHeight';

function makeElement(height: number): HTMLDivElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ height }) as DOMRect;
  return el;
}

describe('useElementHeight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { description: 'no element is attached', element: null, expected: 0 },
    {
      description: 'an element is attached',
      element: makeElement(48),
      expected: 48,
    },
  ])('returns $expected when $description', ({ element, expected }) => {
    const { result } = renderHook(() => useElementHeight({ current: element }));

    expect(result.current).toBe(expected);
  });

  it('updates when the observer reports a resize and disconnects on unmount', () => {
    let notify: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    let height = 40;
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ height }) as DOMRect;

    const { result, rerender, unmount } = renderHook(() =>
      useElementHeight({ current: el }),
    );
    expect(result.current).toBe(40);

    height = 64;
    notify();
    rerender();
    expect(result.current).toBe(64);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
