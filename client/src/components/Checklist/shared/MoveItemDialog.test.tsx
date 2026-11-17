import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MoveItemDialog from './MoveItemDialog';

const categories = [
  { id: 2, name: 'Toiletries' },
  { id: 3, name: '' },
];

function renderDialog(itemName = 'Jacket') {
  const onSelect = vi.fn();
  const onCancel = vi.fn();
  render(
    <MoveItemDialog
      itemName={itemName}
      categories={categories}
      onSelect={onSelect}
      onCancel={onCancel}
    />,
  );
  return { onSelect, onCancel };
}

describe('MoveItemDialog', () => {
  it('names the item and lists every target category', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: '移動到其他分類' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/「Jacket」/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Toiletries' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '未命名分類' }),
    ).toBeInTheDocument();
  });

  it('falls back to a placeholder for an unnamed item', () => {
    renderDialog('');

    expect(screen.getByText(/「未命名項目」/)).toBeInTheDocument();
  });

  it('reports the chosen category id', async () => {
    const { onSelect, onCancel } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toiletries' }));

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels from the cancel button and from Escape', async () => {
    const { onCancel } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
