import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeMounter } from '@/test-utils/render';

import type { EditCategory } from '../../shared/types';

import CategoryEditList from './CategoryEditList';

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
    ],
    ...overrides,
  };
}

const renderList = makeMounter(CategoryEditList, () => ({
  categories: [makeCategory()],
  expandedCats: new Set<number>(),
  onToggleExpand: vi.fn(),
  onUpdateName: vi.fn(),
  onRemove: vi.fn(),
  onAddCategory: vi.fn(),
  onAddItem: vi.fn(),
  onUpdateItem: vi.fn(),
  onDeleteItem: vi.fn(),
  onAddSpec: vi.fn(),
  onUpdateSpec: vi.fn(),
  onDeleteSpec: vi.fn(),
}));

describe('CategoryEditList', () => {
  it('renders every category name collapsed by default', () => {
    renderList();

    expect(screen.getByDisplayValue('Category A')).toBeInTheDocument();
    expect(screen.queryByText('Item A')).not.toBeInTheDocument();
  });

  it('shows the items of an expanded category', () => {
    renderList({ expandedCats: new Set([1]) });

    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('calls onToggleExpand with the category id when its header is clicked', async () => {
    const onToggleExpand = vi.fn();
    const user = userEvent.setup();
    renderList({ onToggleExpand });

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(onToggleExpand).toHaveBeenCalledWith(1);
  });

  it('calls onUpdateName with the category id when its name changes', () => {
    const onUpdateName = vi.fn();
    renderList({ onUpdateName });

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
    renderList({ onRemove });

    await user.click(screen.getByLabelText('刪除分類'));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('calls onAddCategory when the add-category button is clicked', async () => {
    const onAddCategory = vi.fn();
    const user = userEvent.setup();
    renderList({ categories: [], onAddCategory });

    await user.click(screen.getByText('新增分類'));

    expect(onAddCategory).toHaveBeenCalledTimes(1);
  });

  it("prefixes an expanded item's callbacks with its category id", async () => {
    const onUpdateItem = vi.fn();
    const onDeleteItem = vi.fn();
    const onAddSpec = vi.fn();
    const user = userEvent.setup();
    renderList({
      expandedCats: new Set([1]),
      onUpdateItem,
      onDeleteItem,
      onAddSpec,
    });

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
    renderList({ expandedCats: new Set([1]), onUpdateSpec, onDeleteSpec });

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
    renderList({ expandedCats: new Set([1]), onAddItem });

    await user.click(screen.getByText('新增項目'));

    expect(onAddItem).toHaveBeenCalledWith(1);
  });
});
