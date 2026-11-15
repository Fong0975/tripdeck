import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditableItemRow from './EditableItemRow';
import type { EditItem, EditSpec } from './types';

function makeItem(overrides: Partial<EditItem> = {}): EditItem {
  return {
    id: 1,
    name: 'Item A',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...overrides,
  };
}

function makeSpec(overrides: Partial<EditSpec> = {}): EditSpec {
  return { id: 10, name: 'Spec A', storage_location: null, ...overrides };
}

function renderRow(item: EditItem) {
  const onUpdateItem = vi.fn();
  const onDeleteItem = vi.fn();
  const onUpdateSpec = vi.fn();
  const onDeleteSpec = vi.fn();
  const onAddSpec = vi.fn();
  render(
    <EditableItemRow
      item={item}
      index={0}
      onUpdateItem={onUpdateItem}
      onDeleteItem={onDeleteItem}
      onUpdateSpec={onUpdateSpec}
      onDeleteSpec={onDeleteSpec}
      onAddSpec={onAddSpec}
    />,
  );
  return { onUpdateItem, onDeleteItem, onUpdateSpec, onDeleteSpec, onAddSpec };
}

describe('EditableItemRow', () => {
  it('renders the index and item name', () => {
    renderRow(makeItem());

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Item A')).toBeInTheDocument();
  });

  it('calls onUpdateItem with the new name when the name input changes', async () => {
    const user = userEvent.setup();
    const { onUpdateItem } = renderRow(makeItem({ name: '' }));

    await user.type(screen.getByPlaceholderText('項目名稱'), 'X');

    expect(onUpdateItem).toHaveBeenCalledWith(1, { name: 'X' });
  });

  // The input is fully controlled by the (static, un-rerendered) `item`
  // prop, so a per-keystroke `user.type()` would have React reset the DOM
  // value back to the original prop between keystrokes. A single
  // `fireEvent.change` sets the final value in one synchronous event.
  it.each([
    { description: 'a numeric value is entered', typed: '3', expected: 3 },
    { description: 'the field is cleared', typed: '', expected: null },
  ])(
    'calls onUpdateItem with quantity=$expected when $description',
    ({ typed, expected }) => {
      const { onUpdateItem } = renderRow(makeItem({ quantity: 1 }));
      const input = screen.getByPlaceholderText('數量');

      fireEvent.change(input, { target: { value: typed } });

      expect(onUpdateItem).toHaveBeenCalledWith(1, { quantity: expected });
    },
  );

  it.each([
    { description: 'text is entered', typed: 'X', expected: 'X' },
    { description: 'the field is cleared', typed: '', expected: null },
  ])(
    'calls onUpdateItem with notes=$expected when $description',
    ({ typed, expected }) => {
      const { onUpdateItem } = renderRow(makeItem({ notes: 'old' }));
      const input = screen.getByPlaceholderText('補充說明');

      fireEvent.change(input, { target: { value: typed } });

      expect(onUpdateItem).toHaveBeenCalledWith(1, { notes: expected });
    },
  );

  it('calls onUpdateItem with the toggled storage location', async () => {
    const user = userEvent.setup();
    const { onUpdateItem } = renderRow(makeItem());

    await user.click(screen.getByLabelText('託運'));

    expect(onUpdateItem).toHaveBeenCalledWith(1, { storage_location: '託運' });
  });

  it('calls onDeleteItem when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const { onDeleteItem } = renderRow(makeItem());

    await user.click(screen.getByLabelText('刪除項目'));

    expect(onDeleteItem).toHaveBeenCalledWith(1);
  });

  it('calls onAddSpec when the add-spec button is clicked', async () => {
    const user = userEvent.setup();
    const { onAddSpec } = renderRow(makeItem());

    await user.click(screen.getByText('新增規格'));

    expect(onAddSpec).toHaveBeenCalledWith(1);
  });

  it('forwards onUpdateSpec/onDeleteSpec with the item id for each rendered spec', async () => {
    const user = userEvent.setup();
    const { onDeleteSpec } = renderRow(
      makeItem({ specs: [makeSpec({ id: 10 })] }),
    );

    await user.click(screen.getByLabelText('刪除規格'));

    expect(onDeleteSpec).toHaveBeenCalledWith(1, 10);
  });

  it('calls onUpdateSpec with the item id and spec id when a spec field changes', () => {
    const { onUpdateSpec } = renderRow(
      makeItem({ specs: [makeSpec({ id: 10 })] }),
    );
    const input = screen.getByPlaceholderText('規格名稱');

    fireEvent.change(input, { target: { value: 'Changed Spec' } });

    expect(onUpdateSpec).toHaveBeenCalledWith(1, 10, { name: 'Changed Spec' });
  });
});
