import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import {
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  moveTemplateItem,
  reorderTemplateItems,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

import type { EditCategory } from '../../shared/types';

import { useSaveCategoryEdit } from './useSaveCategoryEdit';

vi.mock('@/utils/storage');

vi.mock('@/components/ui/toast');

const category = makeChecklistCategory({
  name: 'Category A',
  items: [
    makeChecklistItem({
      id: 10,
      name: 'Item A',
      quantity: 2,
      notes: 'note',
      storage_location: '託運',
      specs: [makeChecklistSpec({ id: 100, name: 'Spec A' })],
    }),
  ],
});

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
  expect(showToast).toHaveBeenCalledWith('success', '已儲存分類。');
  return { onSaved, onClose };
}

beforeEach(() => {
  vi.mocked(addTemplateItem).mockResolvedValue(
    makeChecklistItem({
      id: 999,
      name: 'Brand New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    }),
  );
  vi.mocked(addTemplateItemSpec).mockResolvedValue(
    makeChecklistSpec({ id: 999, name: 'Brand New Spec' }),
  );
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
    expect(showToast).toHaveBeenCalledWith('success', '已儲存分類。');
  });

  it('shows an error toast and does not call onSaved/onClose when saving fails', async () => {
    vi.mocked(updateTemplateCategory).mockRejectedValue(new Error('network'));
    const edit = unchangedEdit();
    edit.name = 'New Name';
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSaveCategoryEdit(category, edit, onSaved, onClose),
    );

    await act(() => result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith('error', '儲存分類失敗，請稍後再試');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it.each([
    {
      description: 'an item delete and add saved before a later spec failure',
      mutate: (edit: EditCategory) => {
        edit.items = [
          {
            id: -1,
            name: 'Brand New',
            quantity: null,
            notes: null,
            storage_location: null,
            specs: [{ id: -2, name: 'Brand New Spec', storage_location: null }],
          },
        ];
      },
      failOnce: () =>
        vi
          .mocked(addTemplateItemSpec)
          .mockRejectedValueOnce(new Error('network')),
      expectedCalls: [
        [deleteTemplateItem, 1],
        [addTemplateItem, 1],
        [addTemplateItemSpec, 2],
      ] as const,
    },
    {
      description: 'a spec delete saved before a later item failure',
      mutate: (edit: EditCategory) => {
        edit.items[0].specs = [];
        edit.items.push({
          id: -3,
          name: 'Brand New',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [],
        });
      },
      failOnce: () =>
        vi.mocked(addTemplateItem).mockRejectedValueOnce(new Error('network')),
      expectedCalls: [
        [deleteTemplateItemSpec, 1],
        [addTemplateItem, 2],
      ] as const,
    },
  ])(
    'does not repeat completed creates/deletes when retrying after $description',
    async ({ mutate, failOnce, expectedCalls }) => {
      failOnce();
      const edit = unchangedEdit();
      mutate(edit);
      const onSaved = vi.fn();
      const { result } = renderHook(() =>
        useSaveCategoryEdit(category, edit, onSaved, vi.fn()),
      );

      await act(() => result.current.handleSave());
      expect(onSaved).not.toHaveBeenCalled();
      await act(() => result.current.handleSave());

      expect(onSaved).toHaveBeenCalledTimes(1);
      for (const [api, times] of expectedCalls) {
        expect(api).toHaveBeenCalledTimes(times);
      }
    },
  );
});

describe('useSaveCategoryEdit ordering and moves', () => {
  beforeEach(() => {
    vi.mocked(moveTemplateItem).mockReset();
    vi.mocked(reorderTemplateItems).mockReset();
    vi.mocked(addTemplateItem).mockResolvedValue(
      makeChecklistItem({ id: 70, name: 'New' }),
    );
  });

  it('sends no move or reorder call when nothing about order changed', async () => {
    await save(unchangedEdit());

    expect(moveTemplateItem).not.toHaveBeenCalled();
    expect(reorderTemplateItems).not.toHaveBeenCalled();
  });

  it('moves an item flagged for another category after syncing its fields', async () => {
    const edit = unchangedEdit();
    edit.items[0] = { ...edit.items[0], name: 'Renamed', _movedTo: 5 };

    await save(edit);

    expect(updateTemplateItem).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({ name: 'Renamed' }),
    );
    expect(moveTemplateItem).toHaveBeenCalledWith(1, 10, 5);
    expect(deleteTemplateItem).not.toHaveBeenCalled();
    const updateOrder =
      vi.mocked(updateTemplateItem).mock.invocationCallOrder[0];
    const moveOrder = vi.mocked(moveTemplateItem).mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(moveOrder);
  });

  it('ignores the move flag of an unsaved or deleted item', async () => {
    const edit = unchangedEdit();
    edit.items[0] = { ...edit.items[0], _movedTo: 5, _deleted: true };

    await save(edit);

    expect(moveTemplateItem).not.toHaveBeenCalled();
  });

  it('reorders the items after they were rearranged', async () => {
    const edit = unchangedEdit();
    edit.items.push({
      id: -2,
      name: 'Second',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });
    edit.items.reverse();

    await save(edit);

    expect(reorderTemplateItems).toHaveBeenCalledWith(1, [70, 10]);
  });

  it('leaves moved items out of the desired order', async () => {
    const edit = unchangedEdit();
    edit.items.push({
      id: 11,
      name: 'Item B',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });
    edit.items[0] = { ...edit.items[0], _movedTo: 5 };
    const original = makeChecklistCategory({
      name: 'Category A',
      items: [...category.items, makeChecklistItem({ id: 11, name: 'Item B' })],
    });
    const { result } = renderHook(() =>
      useSaveCategoryEdit(original, edit, vi.fn(), vi.fn()),
    );

    await act(() => result.current.handleSave());

    expect(reorderTemplateItems).not.toHaveBeenCalled();
    expect(moveTemplateItem).toHaveBeenCalledWith(1, 10, 5);
  });
});
