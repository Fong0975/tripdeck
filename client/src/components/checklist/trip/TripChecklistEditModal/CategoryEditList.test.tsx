import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EditCategory, EditItem, EditSpec } from '../../shared/types';

import CategoryEditList from './CategoryEditList';

vi.mock('../../shared/EditableItemRow', () => ({
  default: ({
    item,
    onUpdateItem,
    onDeleteItem,
    onAddSpec,
    onUpdateSpec,
    onDeleteSpec,
  }: {
    item: EditItem;
    onUpdateItem: (itemId: number, fields: Partial<EditItem>) => void;
    onDeleteItem: (itemId: number) => void;
    onAddSpec: (itemId: number) => void;
    onUpdateSpec: (
      itemId: number,
      specId: number,
      fields: Partial<EditSpec>,
    ) => void;
    onDeleteSpec: (itemId: number, specId: number) => void;
  }) => (
    <div>
      <span>{item.name}</span>
      <button onClick={() => onUpdateItem(item.id, { name: 'Updated' })}>
        update-item-{item.id}
      </button>
      <button onClick={() => onDeleteItem(item.id)}>
        delete-item-{item.id}
      </button>
      <button onClick={() => onAddSpec(item.id)}>add-spec-{item.id}</button>
      <button
        onClick={() => onUpdateSpec(item.id, 100, { name: 'Updated Spec' })}
      >
        update-spec-{item.id}
      </button>
      <button onClick={() => onDeleteSpec(item.id, 100)}>
        delete-spec-{item.id}
      </button>
    </div>
  ),
}));

function makeCategory(overrides: Partial<EditCategory> = {}): EditCategory {
  return {
    id: 1,
    name: 'Category A',
    items: [
      {
        id: 10,
        name: 'Item A',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      },
    ],
    ...overrides,
  };
}

describe('CategoryEditList', () => {
  it('renders every category name collapsed by default', () => {
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set()}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Category A')).toBeInTheDocument();
    expect(screen.queryByText('Item A')).not.toBeInTheDocument();
  });

  it('shows the items of an expanded category', () => {
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set([1])}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('calls onToggleExpand with the category id when its header is clicked', async () => {
    const onToggleExpand = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set()}
        onToggleExpand={onToggleExpand}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(onToggleExpand).toHaveBeenCalledWith(1);
  });

  it('calls onUpdateName with the category id when its name changes', () => {
    const onUpdateName = vi.fn();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set()}
        onToggleExpand={vi.fn()}
        onUpdateName={onUpdateName}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    // The input is controlled by the (static, un-rerendered) `cat.name`
    // prop, so a single `fireEvent.change` is used instead of per-keystroke
    // `user.type()`, which would have React reset the DOM value between
    // keystrokes.
    fireEvent.change(screen.getByDisplayValue('Category A'), {
      target: { value: 'Category AX' },
    });

    expect(onUpdateName).toHaveBeenCalledWith(1, 'Category AX');
  });

  it('calls onRemove with the category id when its delete button is clicked', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set()}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={onRemove}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('刪除分類'));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('calls onAddCategory when the add-category button is clicked', async () => {
    const onAddCategory = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[]}
        expandedCats={new Set()}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={onAddCategory}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    await user.click(screen.getByText('新增分類'));

    expect(onAddCategory).toHaveBeenCalledTimes(1);
  });

  it("prefixes an expanded item's callbacks with its category id", async () => {
    const onUpdateItem = vi.fn();
    const onDeleteItem = vi.fn();
    const onAddSpec = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set([1])}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        onAddSpec={onAddSpec}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    await user.click(screen.getByText('update-item-10'));
    await user.click(screen.getByText('delete-item-10'));
    await user.click(screen.getByText('add-spec-10'));

    expect(onUpdateItem).toHaveBeenCalledWith(1, 10, { name: 'Updated' });
    expect(onDeleteItem).toHaveBeenCalledWith(1, 10);
    expect(onAddSpec).toHaveBeenCalledWith(1, 10);
  });

  it("prefixes an expanded item's spec callbacks with its category id", async () => {
    const onUpdateSpec = vi.fn();
    const onDeleteSpec = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set([1])}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={onUpdateSpec}
        onDeleteSpec={onDeleteSpec}
      />,
    );

    await user.click(screen.getByText('update-spec-10'));
    await user.click(screen.getByText('delete-spec-10'));

    expect(onUpdateSpec).toHaveBeenCalledWith(1, 10, 100, {
      name: 'Updated Spec',
    });
    expect(onDeleteSpec).toHaveBeenCalledWith(1, 10, 100);
  });

  it('calls onAddItem with the category id when its add-item button is clicked', async () => {
    const onAddItem = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditList
        categories={[makeCategory()]}
        expandedCats={new Set([1])}
        onToggleExpand={vi.fn()}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAddCategory={vi.fn()}
        onAddItem={onAddItem}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onAddSpec={vi.fn()}
        onUpdateSpec={vi.fn()}
        onDeleteSpec={vi.fn()}
      />,
    );

    await user.click(screen.getByText('新增項目'));

    expect(onAddItem).toHaveBeenCalledWith(1);
  });
});
