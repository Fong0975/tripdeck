import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEscapeToClose } from './useEscapeToClose';

function pressKey(key: string) {
  fireEvent.keyDown(window, { key });
}

describe('useEscapeToClose', () => {
  it.each([
    { key: 'Escape', expectedCalls: 1 },
    { key: 'Enter', expectedCalls: 0 },
    { key: 'a', expectedCalls: 0 },
  ])(
    'calls the handler $expectedCalls time(s) when $key is pressed',
    ({ key, expectedCalls }) => {
      const onEscape = vi.fn();
      renderHook(() => useEscapeToClose(onEscape));

      pressKey(key);

      expect(onEscape).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it.each([
    {
      description: 'only the top-most dialog responds while both are open',
      unmountTop: false,
      expectedBottom: 0,
      expectedTop: 1,
    },
    {
      description: 'the dialog below responds once the top one closes',
      unmountTop: true,
      expectedBottom: 1,
      expectedTop: 0,
    },
  ])('$description', ({ unmountTop, expectedBottom, expectedTop }) => {
    const onBottom = vi.fn();
    const onTop = vi.fn();
    renderHook(() => useEscapeToClose(onBottom));
    const { unmount: unmountTopDialog } = renderHook(() =>
      useEscapeToClose(onTop),
    );

    if (unmountTop) {
      unmountTopDialog();
    }
    pressKey('Escape');

    expect(onBottom).toHaveBeenCalledTimes(expectedBottom);
    expect(onTop).toHaveBeenCalledTimes(expectedTop);
  });

  it('uses the latest handler after a rerender', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useEscapeToClose(cb), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    pressKey('Escape');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps a lower dialog below the top one when the lower one rerenders', () => {
    const onLower = vi.fn();
    const onTop = vi.fn();
    const { rerender: rerenderLower } = renderHook(
      ({ cb }) => useEscapeToClose(cb),
      { initialProps: { cb: vi.fn() } },
    );
    renderHook(() => useEscapeToClose(onTop));

    rerenderLower({ cb: onLower });
    pressKey('Escape');

    expect(onLower).not.toHaveBeenCalled();
    expect(onTop).toHaveBeenCalledTimes(1);
  });

  it('stops responding after the only dialog unmounts', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(onEscape));

    unmount();
    pressKey('Escape');

    expect(onEscape).not.toHaveBeenCalled();
  });
});
