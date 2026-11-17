import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';

import type { EditItem } from '../../shared/types';

import CategoryEditPanel from './CategoryEditPanel';
import { useEditState } from './useEditState';
import { useSaveCategoryEdit } from './useSaveCategoryEdit';

vi.mock('./useEditState', () => ({
  useEditState: vi.fn(),
}));
vi.mock('./useSaveCategoryEdit', () => ({
  useSaveCategoryEdit: vi.fn(),
}));
vi.mock('../../shared/EditableItemRow', async () => ({
  default: (await import('@/test-utils/stubs')).EditableItemRowStub,
}));

const category = makeChecklistCategory({
  name: 'Category A',
  items: [makeChecklistItem({ id: 10, name: 'Item A' })],
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
    isDirty: false,
    scrollBodyRef: { current: null },
    visibleItems: editItems,
    updateCategoryName: vi.fn(),
    updateItem: vi.fn(),
    handleDeleteItem: vi.fn(),
    reorderItems: vi.fn(),
    moveItem: vi.fn(),
    addItem: vi.fn(),
    updateSpec: vi.fn(),
    deleteSpec: vi.fn(),
    addSpec: vi.fn(),
    ...overrides,
  });
}

function mockSave(saving = false, handleSave = vi.fn()) {
  vi.mocked(useSaveCategoryEdit).mockReturnValue({ saving, handleSave });
  return handleSave;
}

function renderPanel(
  props: Partial<Parameters<typeof CategoryEditPanel>[0]> = {},
) {
  const handlers = {
    otherCategories: [
      { id: 2, name: 'Category B' },
      { id: 3, name: 'Category C' },
    ],
    onSaved: vi.fn(),
    onDone: vi.fn(),
    onCancel: vi.fn(),
    onDirtyChange: vi.fn(),
    ...props,
  };
  const view = render(<CategoryEditPanel category={category} {...handlers} />);
  return { ...view, ...handlers };
}

beforeEach(() => {
  mockEditState();
  mockSave();
});

describe('CategoryEditPanel', () => {
  it('renders the labelled name input and the item rows', () => {
    renderPanel();

    expect(screen.getByLabelText('分類名稱')).toHaveValue('Category A');
    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('forwards name edits and 新增項目 clicks to the edit state', async () => {
    const updateCategoryName = vi.fn();
    const addItem = vi.fn();
    mockEditState({ updateCategoryName, addItem });
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText('分類名稱'), 'X');
    await user.click(screen.getByRole('button', { name: '新增項目' }));

    expect(updateCategoryName).toHaveBeenCalled();
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it('wires useSaveCategoryEdit with the saved/done callbacks', () => {
    const { onSaved, onDone } = renderPanel();

    expect(useSaveCategoryEdit).toHaveBeenCalledWith(
      category,
      expect.objectContaining({ name: 'Category A' }),
      onSaved,
      onDone,
    );
  });

  it.each([
    { saving: false, label: '儲存', disabled: false },
    { saving: true, label: '儲存中…', disabled: true },
  ])(
    'shows "$label" and disabled=$disabled when saving=$saving',
    ({ saving, label, disabled }) => {
      mockSave(saving);
      renderPanel();

      const button = screen.getByRole('button', { name: label });
      expect(button)[disabled ? 'toBeDisabled' : 'toBeEnabled']();
    },
  );

  it('calls handleSave when 儲存 is clicked', async () => {
    const handleSave = mockSave();
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when 取消 is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderPanel();

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('reports dirtiness and resets it to false on unmount', () => {
    mockEditState({ isDirty: true });
    const { onDirtyChange, unmount } = renderPanel();

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    unmount();

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('moves an item to the category picked in the move dialog', async () => {
    const moveItem = vi.fn();
    mockEditState({ moveItem });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'move-item-10' }));
    await user.click(screen.getByRole('button', { name: 'Category B' }));

    expect(moveItem).toHaveBeenCalledWith(10, 2);
  });

  it.each([
    { description: 'there is no other category', others: [], itemId: 10 },
    {
      description: 'the item is not saved yet',
      others: [{ id: 2, name: 'Category B' }],
      itemId: -1,
    },
  ])('disables moving when $description', ({ others, itemId }) => {
    const unsaved = { ...editItems[0], id: itemId };
    mockEditState({ visibleItems: [unsaved] });
    renderPanel({ otherCategories: others });

    expect(
      screen.getByRole('button', { name: `move-item-${itemId}` }),
    ).toBeDisabled();
  });
});
