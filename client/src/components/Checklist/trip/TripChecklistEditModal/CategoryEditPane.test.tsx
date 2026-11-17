import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeMounter } from '@/test-utils/render';

import type { EditCategory } from '../../shared/types';

import CategoryEditPane from './CategoryEditPane';

vi.mock('../../shared/EditableItemRow', async () => ({
  default: (await import('@/test-utils/stubs')).EditableItemRowStub,
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
      {
        id: 11,
        name: 'Item Deleted',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
        _deleted: true,
      },
    ],
    ...overrides,
  };
}

const renderPane = makeMounter(CategoryEditPane, () => ({
  category: makeCategory(),
  otherCategories: [
    { id: 2, name: 'Category B' },
    { id: 3, name: 'Category C' },
  ],
  scrollBodyRef: { current: null },
  onUpdateName: vi.fn(),
  onRemove: vi.fn(),
  onAddItem: vi.fn(),
  onUpdateItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onAddSpec: vi.fn(),
  onUpdateSpec: vi.fn(),
  onDeleteSpec: vi.fn(),
  onReorderItems: vi.fn(),
  onMoveItem: vi.fn(),
}));

describe('CategoryEditPane', () => {
  it('shows the category name and only the items that are not deleted', () => {
    renderPane();

    expect(screen.getByLabelText('分類名稱')).toHaveValue('Category A');
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.queryByText('Item Deleted')).not.toBeInTheDocument();
  });

  it('calls onUpdateName with the category id when the name changes', () => {
    const onUpdateName = vi.fn();
    renderPane({ onUpdateName });

    fireEvent.change(screen.getByLabelText('分類名稱'), {
      target: { value: 'Category AX' },
    });

    expect(onUpdateName).toHaveBeenCalledWith(1, 'Category AX');
  });

  it.each([
    {
      description: 'the delete-category button',
      click: '刪除分類',
      handler: 'onRemove',
      expected: [1],
    },
    {
      description: 'the add-item button',
      click: '新增項目',
      handler: 'onAddItem',
      expected: [1],
    },
    {
      description: "an item's update trigger",
      click: 'update-item-10',
      handler: 'onUpdateItem',
      expected: [1, 10, { name: 'Updated' }],
    },
    {
      description: "an item's delete trigger",
      click: 'delete-item-10',
      handler: 'onDeleteItem',
      expected: [1, 10],
    },
    {
      description: "an item's add-spec trigger",
      click: 'add-spec-10',
      handler: 'onAddSpec',
      expected: [1, 10],
    },
    {
      description: "a spec's update trigger",
      click: 'update-spec-10',
      handler: 'onUpdateSpec',
      expected: [1, 10, 100, { name: 'Updated Spec' }],
    },
    {
      description: "a spec's delete trigger",
      click: 'delete-spec-10',
      handler: 'onDeleteSpec',
      expected: [1, 10, 100],
    },
  ] as const)(
    'prefixes the category id when $description is used',
    async ({ click, handler, expected }) => {
      const callback = vi.fn();
      const user = userEvent.setup();
      renderPane({ [handler]: callback });

      await user.click(screen.getByRole('button', { name: click }));

      expect(callback).toHaveBeenCalledWith(...expected);
    },
  );

  it('moves an item to the category picked in the move dialog', async () => {
    const onMoveItem = vi.fn();
    const user = userEvent.setup();
    renderPane({ onMoveItem });

    await user.click(screen.getByRole('button', { name: 'move-item-10' }));
    await user.click(screen.getByRole('button', { name: 'Category C' }));

    expect(onMoveItem).toHaveBeenCalledWith(1, 10, 3);
    expect(
      screen.queryByRole('dialog', { name: '移動到其他分類' }),
    ).not.toBeInTheDocument();
  });

  it('closes the move dialog without moving when cancelled', async () => {
    const onMoveItem = vi.fn();
    const user = userEvent.setup();
    renderPane({ onMoveItem });

    await user.click(screen.getByRole('button', { name: 'move-item-10' }));
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(onMoveItem).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables moving when there is no other category', () => {
    renderPane({ otherCategories: [] });

    expect(screen.getByRole('button', { name: 'move-item-10' })).toBeDisabled();
  });
});
