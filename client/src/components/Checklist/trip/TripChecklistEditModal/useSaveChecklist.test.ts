import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
  makeTripChecklist,
} from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  moveTripItem,
  reorderTripCategories,
  reorderTripItems,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

import type { EditCategory, EditOccasion } from '../../shared/types';

import { useSaveChecklist } from './useSaveChecklist';

vi.mock('@/utils/storage');

vi.mock('@/components/ui/toast');

const checklist = makeTripChecklist({
  occasions: [{ id: 1, name: 'Occasion A', checks: {}, specChecks: {} }],
  categories: [
    makeChecklistCategory({
      name: 'Category A',
      items: [
        makeChecklistItem({
          id: 10,
          name: 'Item A',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [makeChecklistSpec({ id: 100, name: 'Spec A' })],
        }),
      ],
    }),
  ],
});

function unchangedEdit(): {
  occasions: EditOccasion[];
  categories: EditCategory[];
} {
  return {
    occasions: [{ id: 1, name: 'Occasion A' }],
    categories: [
      {
        id: 1,
        name: 'Category A',
        items: [
          {
            id: 10,
            name: 'Item A',
            quantity: null,
            notes: null,
            storage_location: null,
            specs: [{ id: 100, name: 'Spec A', storage_location: null }],
          },
        ],
      },
    ],
  };
}

async function save(edit: ReturnType<typeof unchangedEdit>) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useSaveChecklist(1, checklist, edit, onSaved, onClose),
  );
  await act(() => result.current.handleSave());
  expect(showToast).toHaveBeenCalledWith('success', '已儲存行李清單。');
  return { onSaved, onClose };
}

beforeEach(() => {
  vi.mocked(addOccasion).mockResolvedValue({
    id: 50,
    name: 'New',
    checks: {},
    specChecks: {},
  });
  vi.mocked(addTripCategory).mockResolvedValue(
    makeChecklistCategory({ id: 60, name: 'New' }),
  );
  vi.mocked(addTripItem).mockResolvedValue(
    makeChecklistItem({
      id: 70,
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    }),
  );
  vi.mocked(addTripItemSpec).mockResolvedValue(
    makeChecklistSpec({ id: 80, name: 'New' }),
  );
});

describe('useSaveChecklist', () => {
  it('updates an occasion whose name changed', async () => {
    const edit = unchangedEdit();
    edit.occasions[0].name = 'Renamed';

    await save(edit);

    expect(updateOccasion).toHaveBeenCalledWith(1, 1, 'Renamed');
  });

  it('falls back to the original name when an occasion is updated with a blank name', async () => {
    const edit = unchangedEdit();
    edit.occasions[0].name = '   ';

    await save(edit);

    expect(updateOccasion).toHaveBeenCalledWith(1, 1, 'Occasion A');
  });

  it('adds a locally-created occasion', async () => {
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: 'New' });

    await save(edit);

    expect(addOccasion).toHaveBeenCalledWith(1, 'New');
  });

  it('falls back to the default name when a locally-created occasion has a blank name', async () => {
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: '   ' });

    await save(edit);

    expect(addOccasion).toHaveBeenCalledWith(1, '新時機');
  });

  it('removes an occasion no longer present in the edited list', async () => {
    const edit = unchangedEdit();
    edit.occasions = [];

    await save(edit);

    expect(deleteOccasion).toHaveBeenCalledWith(1, 1);
  });

  it('updates a category whose name changed', async () => {
    const edit = unchangedEdit();
    edit.categories[0].name = 'Renamed Cat';

    await save(edit);

    expect(updateTripCategory).toHaveBeenCalledWith(1, 1, 'Renamed Cat');
  });

  it('falls back to the original name when a category is updated with a blank name', async () => {
    const edit = unchangedEdit();
    edit.categories[0].name = '   ';

    await save(edit);

    expect(updateTripCategory).toHaveBeenCalledWith(1, 1, 'Category A');
  });

  it('adds a locally-created category, falling back to a default name', async () => {
    const edit = unchangedEdit();
    edit.categories.push({ id: -1, name: '  ', items: [] });

    await save(edit);

    expect(addTripCategory).toHaveBeenCalledWith(1, '新分類');
  });

  it('removes a category no longer present in the edited list', async () => {
    const edit = unchangedEdit();
    edit.categories = [];

    await save(edit);

    expect(deleteTripCategory).toHaveBeenCalledWith(1, 1);
  });

  it('updates an item whose fields changed within an existing category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].name = 'Changed';

    await save(edit);

    expect(updateTripItem).toHaveBeenCalledWith(1, 10, {
      name: 'Changed',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('adds a locally-created item to an existing category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items.push({
      id: -1,
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });

    await save(edit);

    expect(addTripItem).toHaveBeenCalledWith(1, 1, {
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('removes an item no longer present in its category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items = [];

    await save(edit);

    expect(deleteTripItem).toHaveBeenCalledWith(1, 10);
  });

  it('updates a spec whose fields changed within an existing item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs[0].storage_location = '隨身';

    await save(edit);

    expect(updateTripItemSpec).toHaveBeenCalledWith(1, 10, 100, {
      name: 'Spec A',
      storage_location: '隨身',
    });
  });

  it('adds a locally-created spec to an existing item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs.push({
      id: -1,
      name: 'New',
      storage_location: null,
    });

    await save(edit);

    expect(addTripItemSpec).toHaveBeenCalledWith(1, 10, {
      name: 'New',
      storage_location: null,
    });
  });

  it('removes a spec no longer present on its item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs = [];

    await save(edit);

    expect(deleteTripItemSpec).toHaveBeenCalledWith(1, 10, 100);
  });

  it('calls onSaved and onClose after a successful save', async () => {
    const { onSaved, onClose } = await save(unchangedEdit());

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tracks saving as true while in flight and false once settled', async () => {
    let resolveAdd!: (value: ChecklistOccasion) => void;
    vi.mocked(addOccasion).mockReturnValue(
      new Promise(resolve => {
        resolveAdd = resolve;
      }),
    );
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: 'New' });
    const { result } = renderHook(() =>
      useSaveChecklist(1, checklist, edit, vi.fn(), vi.fn()),
    );

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleSave();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveAdd({ id: 50, name: 'New', checks: {}, specChecks: {} });
      await savePromise;
    });
    expect(result.current.saving).toBe(false);
    expect(showToast).toHaveBeenCalledWith('success', '已儲存行李清單。');
  });

  it('shows an error toast and does not call onSaved/onClose when saving fails', async () => {
    vi.mocked(updateOccasion).mockRejectedValue(new Error('network'));
    const edit = unchangedEdit();
    edit.occasions[0].name = 'Renamed';
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSaveChecklist(1, checklist, edit, onSaved, onClose),
    );

    await act(() => result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith(
      'error',
      '儲存行李清單失敗，請稍後再試',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it.each([
    {
      description: 'occasions saved before a later category failure',
      mutate: (edit: ReturnType<typeof unchangedEdit>) => {
        edit.occasions = [{ id: -1, name: 'New' }];
        edit.categories.push({ id: -2, name: 'New', items: [] });
      },
      failOnce: () =>
        vi.mocked(addTripCategory).mockRejectedValueOnce(new Error('network')),
      expectedCalls: [
        [deleteOccasion, 1],
        [addOccasion, 1],
        [addTripCategory, 2],
      ] as const,
    },
    {
      description: 'items and specs saved before a later spec failure',
      mutate: (edit: ReturnType<typeof unchangedEdit>) => {
        edit.categories[0].items[0].specs = [];
        edit.categories[0].items.push({
          id: -3,
          name: 'New',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [{ id: -4, name: 'New', storage_location: null }],
        });
      },
      failOnce: () =>
        vi.mocked(addTripItemSpec).mockRejectedValueOnce(new Error('network')),
      expectedCalls: [
        [deleteTripItemSpec, 1],
        [addTripItem, 1],
        [addTripItemSpec, 2],
      ] as const,
    },
  ])(
    'does not repeat completed creates/deletes when retrying after a failure: $description',
    async ({ mutate, failOnce, expectedCalls }) => {
      failOnce();
      const edit = unchangedEdit();
      mutate(edit);
      const onSaved = vi.fn();
      const { result } = renderHook(() =>
        useSaveChecklist(1, checklist, edit, onSaved, vi.fn()),
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

  it('ignores a second save while one is already in flight', async () => {
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: 'New' });
    const { result } = renderHook(() =>
      useSaveChecklist(1, checklist, edit, vi.fn(), vi.fn()),
    );

    await act(() =>
      Promise.all([result.current.handleSave(), result.current.handleSave()]),
    );

    expect(addOccasion).toHaveBeenCalledTimes(1);
  });
});

describe('useSaveChecklist ordering and moves', () => {
  const secondCategory = (): EditCategory => ({
    id: 2,
    name: 'Category B',
    items: [],
  });

  function twoCategoryChecklist() {
    return makeTripChecklist({
      occasions: checklist.occasions,
      categories: [
        checklist.categories[0],
        makeChecklistCategory({ id: 2, name: 'Category B', items: [] }),
      ],
    });
  }

  async function saveTwo(edit: ReturnType<typeof unchangedEdit>) {
    const { result } = renderHook(() =>
      useSaveChecklist(1, twoCategoryChecklist(), edit, vi.fn(), vi.fn()),
    );
    await act(() => result.current.handleSave());
  }

  beforeEach(() => {
    vi.mocked(moveTripItem).mockReset();
    vi.mocked(reorderTripItems).mockReset();
    vi.mocked(reorderTripCategories).mockReset();
  });

  it('does not reorder or move anything when only unrelated fields change', async () => {
    const edit = unchangedEdit();
    edit.categories[0].name = 'Renamed Cat';

    await save(edit);

    expect(moveTripItem).not.toHaveBeenCalled();
    expect(reorderTripItems).not.toHaveBeenCalled();
    expect(reorderTripCategories).not.toHaveBeenCalled();
  });

  it('moves an item to another category instead of deleting and re-creating it', async () => {
    const edit = unchangedEdit();
    const [item] = edit.categories[0].items;
    edit.categories[0].items = [];
    edit.categories.push({ ...secondCategory(), items: [item] });

    await saveTwo(edit);

    expect(moveTripItem).toHaveBeenCalledWith(1, 10, 2);
    expect(deleteTripItem).not.toHaveBeenCalled();
    expect(addTripItem).not.toHaveBeenCalled();
  });

  it('still updates the fields of a moved item', async () => {
    const edit = unchangedEdit();
    const [item] = edit.categories[0].items;
    edit.categories[0].items = [];
    edit.categories.push({
      ...secondCategory(),
      items: [{ ...item, name: 'Renamed Item' }],
    });

    await saveTwo(edit);

    expect(updateTripItem).toHaveBeenCalledWith(1, 10, {
      name: 'Renamed Item',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('creates an unsaved category before moving an item into it', async () => {
    const edit = unchangedEdit();
    const [item] = edit.categories[0].items;
    edit.categories[0].items = [];
    edit.categories.push({ id: -1, name: 'Fresh', items: [item] });

    await save(edit);

    expect(addTripCategory).toHaveBeenCalledTimes(1);
    expect(addTripCategory).toHaveBeenCalledWith(1, 'Fresh');
    expect(moveTripItem).toHaveBeenCalledWith(1, 10, 60);
    expect(deleteTripItem).not.toHaveBeenCalled();
    expect(addTripItem).not.toHaveBeenCalled();
  });

  it('moves items out of a category that is then deleted', async () => {
    const edit = unchangedEdit();
    const [item] = edit.categories[0].items;
    edit.categories[0] = { ...edit.categories[0], items: [], _deleted: true };
    edit.categories.push({ ...secondCategory(), items: [item] });

    await saveTwo(edit);

    expect(moveTripItem).toHaveBeenCalledWith(1, 10, 2);
    expect(deleteTripCategory).toHaveBeenCalledWith(1, 1);
    const moveOrder = vi.mocked(moveTripItem).mock.invocationCallOrder[0];
    const deleteOrder =
      vi.mocked(deleteTripCategory).mock.invocationCallOrder[0];
    expect(moveOrder).toBeLessThan(deleteOrder);
  });

  it('reorders the items of a category after they were rearranged', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items.push({
      id: -2,
      name: 'Second',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });
    edit.categories[0].items.reverse();

    await save(edit);

    expect(reorderTripItems).toHaveBeenCalledWith(1, 1, [70, 10]);
  });

  it('reorders the categories after they were rearranged', async () => {
    const edit = unchangedEdit();
    edit.categories.push(secondCategory());
    edit.categories.reverse();

    await saveTwo(edit);

    expect(reorderTripCategories).toHaveBeenCalledWith(1, [2, 1]);
  });

  it('does not repeat a move that succeeded in an earlier attempt', async () => {
    const edit = unchangedEdit();
    const [item] = edit.categories[0].items;
    edit.categories[0].items = [];
    edit.categories.push({ ...secondCategory(), items: [item] });
    vi.mocked(updateTripCategory).mockRejectedValueOnce(new Error('boom'));
    edit.categories[1].name = 'Renamed B';

    const { result } = renderHook(() =>
      useSaveChecklist(1, twoCategoryChecklist(), edit, vi.fn(), vi.fn()),
    );
    await act(() => result.current.handleSave());
    await act(() => result.current.handleSave());

    expect(moveTripItem).toHaveBeenCalledTimes(1);
  });
});
