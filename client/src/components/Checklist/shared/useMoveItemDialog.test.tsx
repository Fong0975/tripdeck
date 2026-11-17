import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useMoveItemDialog } from './useMoveItemDialog';

const categories = [
  { id: 2, name: 'Toiletries' },
  { id: 3, name: 'Docs' },
];

describe('useMoveItemDialog', () => {
  it('renders nothing until a move is requested', () => {
    const { result } = renderHook(() => useMoveItemDialog(categories, vi.fn()));

    expect(result.current.dialog).toBeNull();
  });

  it('opens for the requested item and reports the chosen category', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const { result, rerender } = renderHook(() =>
      useMoveItemDialog(categories, onMove),
    );

    act(() => result.current.openMove({ id: 10, name: 'Jacket' }));
    rerender();
    render(<>{result.current.dialog}</>);
    await user.click(screen.getByRole('button', { name: 'Docs' }));

    expect(onMove).toHaveBeenCalledWith(10, 3);
  });

  it('closes without moving when cancelled', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const { result, rerender } = renderHook(() =>
      useMoveItemDialog(categories, onMove),
    );

    act(() => result.current.openMove({ id: 10, name: 'Jacket' }));
    rerender();
    const view = render(<>{result.current.dialog}</>);
    await user.click(screen.getByRole('button', { name: '取消' }));
    view.unmount();
    rerender();

    expect(onMove).not.toHaveBeenCalled();
    expect(result.current.dialog).toBeNull();
  });
});
