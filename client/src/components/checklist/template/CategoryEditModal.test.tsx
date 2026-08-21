import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChecklistCategory } from '@/types';
import {
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

import CategoryEditModal from './CategoryEditModal';

vi.mock('@/utils/storage', () => ({
  updateTemplateCategory: vi.fn(),
  updateTemplateItem: vi.fn(),
  addTemplateItem: vi.fn(),
  deleteTemplateItem: vi.fn(),
  addTemplateItemSpec: vi.fn(),
  updateTemplateItemSpec: vi.fn(),
  deleteTemplateItemSpec: vi.fn(),
}));

function makeCategory(
  overrides: Partial<ChecklistCategory> = {},
): ChecklistCategory {
  return {
    id: 1,
    name: 'Category A',
    items: [
      {
        id: 10,
        name: 'Item A',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
        specs: [{ id: 100, name: 'Spec A', storage_location: null }],
      },
    ],
    ...overrides,
  };
}

// The modal backdrop is a bare decorative div with no accessible role/name;
// 'absolute' uniquely identifies it (the modal wrapper itself uses 'fixed').
function getBackdrop(container: HTMLElement): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('.absolute') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(addTemplateItem).mockResolvedValue({
    id: 999,
    name: 'Brand New',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
  });
  vi.mocked(addTemplateItemSpec).mockResolvedValue({
    id: 999,
    name: 'Brand New Spec',
    storage_location: null,
  });
});

describe('CategoryEditModal', () => {
  it('renders the category name and its items', () => {
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Category A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Item A')).toBeInTheDocument();
  });

  it('hides an existing item once it is marked deleted', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('刪除項目'));

    expect(screen.queryByDisplayValue('Item A')).not.toBeInTheDocument();
  });

  it('removes a newly added item entirely once it is deleted', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('新增項目'));
    expect(screen.getByDisplayValue('新項目')).toBeInTheDocument();

    await user.click(screen.getAllByLabelText('刪除項目')[1]);

    expect(screen.queryByDisplayValue('新項目')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Item A')).toBeInTheDocument();
  });

  it('saves without calling any update when nothing changed', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    await user.click(screen.getByText('儲存'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateTemplateCategory).not.toHaveBeenCalled();
    expect(updateTemplateItem).not.toHaveBeenCalled();
  });

  it('calls updateTemplateCategory when the category name changed', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const nameInput = screen.getByPlaceholderText('分類名稱');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(updateTemplateCategory).toHaveBeenCalledWith(1, 'New Name'),
    );
  });

  it('calls updateTemplateItem with the full payload when an item field changed', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const itemNameInput = screen.getByPlaceholderText('項目名稱');
    await user.clear(itemNameInput);
    await user.type(itemNameInput, 'Changed');

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(updateTemplateItem).toHaveBeenCalledWith(1, 10, {
        name: 'Changed',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
      }),
    );
  });

  it('calls addTemplateItem with the new item payload', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByText('新增項目'));
    const newItemInput = screen.getAllByPlaceholderText('項目名稱')[1];
    await user.clear(newItemInput);
    await user.type(newItemInput, 'Brand New');

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(addTemplateItem).toHaveBeenCalledWith(1, {
        name: 'Brand New',
        quantity: null,
        notes: null,
        storage_location: null,
      }),
    );
  });

  it('calls deleteTemplateItem for an item deleted before saving', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText('刪除項目'));

    await user.click(screen.getByText('儲存'));

    await waitFor(() => expect(deleteTemplateItem).toHaveBeenCalledWith(1, 10));
  });

  it('closes without saving when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateTemplateCategory).not.toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(getBackdrop(container));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a new spec input when 新增規格 is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('新增規格'));

    expect(screen.getByDisplayValue('新規格')).toBeInTheDocument();
  });

  it('removes a spec input immediately when its delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('刪除規格'));

    expect(screen.queryByDisplayValue('Spec A')).not.toBeInTheDocument();
  });

  it('calls updateTemplateItemSpec with the full payload when a spec field changed', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const specNameInput = screen.getByPlaceholderText('規格名稱');
    await user.clear(specNameInput);
    await user.type(specNameInput, 'Changed Spec');

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(updateTemplateItemSpec).toHaveBeenCalledWith(1, 10, 100, {
        name: 'Changed Spec',
        storage_location: null,
      }),
    );
  });

  it('calls addTemplateItemSpec with the new spec payload', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByText('新增規格'));
    const newSpecInput = screen.getByDisplayValue('新規格');
    await user.clear(newSpecInput);
    await user.type(newSpecInput, 'Brand New Spec');

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(addTemplateItemSpec).toHaveBeenCalledWith(1, 10, {
        name: 'Brand New Spec',
        storage_location: null,
      }),
    );
  });

  it('calls deleteTemplateItemSpec for a spec deleted before saving', async () => {
    const user = userEvent.setup();
    render(
      <CategoryEditModal
        category={makeCategory()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText('刪除規格'));

    await user.click(screen.getByText('儲存'));

    await waitFor(() =>
      expect(deleteTemplateItemSpec).toHaveBeenCalledWith(1, 10, 100),
    );
  });
});
