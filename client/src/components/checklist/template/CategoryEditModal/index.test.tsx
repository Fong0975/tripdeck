import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import { getBackdrop } from '@/test-utils/queries';

import type { EditItem } from '../../shared/types';

import { useEditState } from './useEditState';
import { useSaveCategoryEdit } from './useSaveCategoryEdit';

import CategoryEditModal from './index';

vi.mock('./useEditState', () => ({ useEditState: vi.fn() }));
vi.mock('./useSaveCategoryEdit', () => ({ useSaveCategoryEdit: vi.fn() }));
vi.mock('../../shared/EditableItemRow', async () => ({
  default: (await import('@/test-utils/stubs')).EditableItemRowStub,
}));

const category = makeChecklistCategory({
  name: 'Category A',
  items: [
    makeChecklistItem({
      id: 10,
      name: 'Item A',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    }),
  ],
});

const editItems: EditItem[] = [
  {
    id: 10,
    name: 'Item A',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
  },
];

function mockEditState(
  overrides: Partial<ReturnType<typeof useEditState>> = {},
) {
  vi.mocked(useEditState).mockReturnValue({
    edit: { id: 1, name: 'Category A', items: editItems },
    scrollBodyRef: { current: null },
    visibleItems: editItems,
    updateCategoryName: vi.fn(),
    updateItem: vi.fn(),
    handleDeleteItem: vi.fn(),
    addItem: vi.fn(),
    updateSpec: vi.fn(),
    deleteSpec: vi.fn(),
    addSpec: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  mockEditState();
});

describe('CategoryEditModal', () => {
  it('renders the category name input and its items', () => {
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });

    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Category A')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('calls updateCategoryName when the name input changes', async () => {
    const updateCategoryName = vi.fn();
    mockEditState({ updateCategoryName });
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('分類名稱'), 'X');

    expect(updateCategoryName).toHaveBeenCalled();
  });

  it('calls addItem when 新增項目 is clicked', async () => {
    const addItem = vi.fn();
    mockEditState({ addItem });
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('新增項目'));

    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it('wires the item handlers from useEditState through to each item row', async () => {
    const updateItem = vi.fn();
    const handleDeleteItem = vi.fn();
    const addSpec = vi.fn();
    const updateSpec = vi.fn();
    const deleteSpec = vi.fn();
    mockEditState({
      updateItem,
      handleDeleteItem,
      addSpec,
      updateSpec,
      deleteSpec,
    });
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('update-item-10'));
    await user.click(screen.getByText('delete-item-10'));
    await user.click(screen.getByText('add-spec-10'));
    await user.click(screen.getByText('update-spec-10'));
    await user.click(screen.getByText('delete-spec-10'));

    expect(updateItem).toHaveBeenCalledWith(10, { name: 'Updated' });
    expect(handleDeleteItem).toHaveBeenCalledWith(10);
    expect(addSpec).toHaveBeenCalledWith(10);
    expect(updateSpec).toHaveBeenCalledWith(10, 100, { name: 'Updated Spec' });
    expect(deleteSpec).toHaveBeenCalledWith(10, 100);
  });

  it('closes without saving when cancel is clicked', async () => {
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={category}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <CategoryEditModal
        category={category}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(getBackdrop(container));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls handleSave when the save button is clicked', async () => {
    const handleSave = vi.fn();
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: false,
      handleSave,
    });
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('儲存'));

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled saving state while saving is in progress', () => {
    vi.mocked(useSaveCategoryEdit).mockReturnValue({
      saving: true,
      handleSave: vi.fn(),
    });

    render(
      <CategoryEditModal
        category={category}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('儲存中…')).toBeDisabled();
  });
});
