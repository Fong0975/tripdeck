import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ItemActionBar from './ItemActionBar';

describe('ItemActionBar', () => {
  it('always offers delete and calls onDelete', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<ItemActionBar onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: '刪除項目' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides the move button when no move handler is given', () => {
    render(<ItemActionBar onDelete={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: '移動項目到其他分類' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { moveDisabled: false, enabled: true },
    { moveDisabled: true, enabled: false },
  ])(
    'enables the move button only when moveDisabled=$moveDisabled',
    async ({ moveDisabled, enabled }) => {
      const onMove = vi.fn();
      const user = userEvent.setup();
      render(
        <ItemActionBar
          onMove={onMove}
          moveDisabled={moveDisabled}
          onDelete={vi.fn()}
        />,
      );
      const button = screen.getByRole('button', { name: '移動項目到其他分類' });

      await user.click(button);

      expect(button)[enabled ? 'toBeEnabled' : 'toBeDisabled']();
      expect(onMove).toHaveBeenCalledTimes(enabled ? 1 : 0);
    },
  );
});
