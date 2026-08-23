import { act, renderHook } from '@testing-library/react';
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

import type { EditCategory } from '../../shared/types';

import { useSaveCategoryEdit } from './useSaveCategoryEdit';

vi.mock('@/utils/storage', () => ({
  updateTemplateCategory: vi.fn(),
  updateTemplateItem: vi.fn(),
  addTemplateItem: vi.fn(),
  deleteTemplateItem: vi.fn(),
  addTemplateItemSpec: vi.fn(),
  updateTemplateItemSpec: vi.fn(),
  deleteTemplateItemSpec: vi.fn(),
}));

const category: ChecklistCategory = {
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
};

function unchangedEdit(): EditCategory {
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
  };
}

async function save(edit: EditCategory) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useSaveCategoryEdit(category, edit, onSaved, onClose),
  );
  await act(() => result.current.handleSave());
  return { onSaved, onClose };
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

describe('useSaveCategoryEdit', () => {
  it('saves without calling any update when nothing changed', async () => {
    const { onSaved, onClose } = await save(unchangedEdit());

    expect(updateTemplateCategory).not.toHaveBeenCalled();
    expect(updateTemplateItem).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls updateTemplateCategory when the category name changed', async () => {
    const edit = unchangedEdit();
    edit.name = 'New Name';

    await save(edit);

    expect(updateTemplateCategory).toHaveBeenCalledWith(1, 'New Name');
  });

  it('calls updateTemplateItem with the full payload when an item field changed', async () => {
    const edit = unchangedEdit();
    edit.items[0].name = 'Changed';

    await save(edit);

    expect(updateTemplateItem).toHaveBeenCalledWith(1, 10, {
      name: 'Changed',
      quantity: 2,
      notes: 'note',
      storage_location: '託運',
    });
  });

  it('calls addTemplateItem with the new item payload', async () => {
    const edit = unchangedEdit();
    edit.items.push({
      id: -1,
      name: 'Brand New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });

    await save(edit);

    expect(addTemplateItem).toHaveBeenCalledWith(1, {
      name: 'Brand New',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('calls deleteTemplateItem for an item deleted before saving', async () => {
    const edit = unchangedEdit();
    edit.items = [];

    await save(edit);

    expect(deleteTemplateItem).toHaveBeenCalledWith(1, 10);
  });

  it('calls updateTemplateItemSpec with the full payload when a spec field changed', async () => {
    const edit = unchangedEdit();
    edit.items[0].specs[0].name = 'Changed Spec';

    await save(edit);

    expect(updateTemplateItemSpec).toHaveBeenCalledWith(1, 10, 100, {
      name: 'Changed Spec',
      storage_location: null,
    });
  });

  it('calls addTemplateItemSpec with the new spec payload', async () => {
    const edit = unchangedEdit();
    edit.items[0].specs.push({
      id: -1,
      name: 'Brand New Spec',
      storage_location: null,
    });

    await save(edit);

    expect(addTemplateItemSpec).toHaveBeenCalledWith(1, 10, {
      name: 'Brand New Spec',
      storage_location: null,
    });
  });

  it('calls deleteTemplateItemSpec for a spec deleted before saving', async () => {
    const edit = unchangedEdit();
    edit.items[0].specs = [];

    await save(edit);

    expect(deleteTemplateItemSpec).toHaveBeenCalledWith(1, 10, 100);
  });

  it('tracks saving as true while in flight and false once settled', async () => {
    let resolveAdd!: (value: {
      id: number;
      name: string;
      quantity: number | null;
      notes: string | null;
      storage_location: string | null;
      specs: never[];
    }) => void;
    vi.mocked(addTemplateItem).mockReturnValue(
      new Promise(resolve => {
        resolveAdd = resolve;
      }),
    );
    const edit = unchangedEdit();
    edit.items.push({
      id: -1,
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });
    const { result } = renderHook(() =>
      useSaveCategoryEdit(category, edit, vi.fn(), vi.fn()),
    );

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleSave();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveAdd({
        id: 999,
        name: 'New',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
      await savePromise;
    });
    expect(result.current.saving).toBe(false);
  });
});
