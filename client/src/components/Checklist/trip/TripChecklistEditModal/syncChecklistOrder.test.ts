import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import type { ChecklistCategory, ChecklistItem } from '@/types';
import { reorderTripCategories, reorderTripItems } from '@/utils/storage';

import { createSyncTracker } from '../../shared/checklistDiffSync';
import type { EditCategory, EditItem } from '../../shared/types';

import { syncChecklistOrder } from './syncChecklistOrder';

vi.mock('@/utils/storage');

function editItem(id: number, extra: Partial<EditItem> = {}): EditItem {
  return {
    id,
    name: `Item ${id}`,
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...extra,
  };
}

const originals: ChecklistCategory[] = [
  makeChecklistCategory({
    id: 1,
    items: [makeChecklistItem({ id: 10 }), makeChecklistItem({ id: 11 })],
  }),
  makeChecklistCategory({ id: 2, items: [makeChecklistItem({ id: 20 })] }),
];

function run(
  edited: EditCategory[],
  extra: {
    itemsAfterMoves?: Map<number, ChecklistItem[]>;
    categoryAdded?: Array<[number, number]>;
    itemAdded?: Array<[number, number]>;
  } = {},
) {
  const categoryTracker = createSyncTracker<ChecklistCategory>();
  for (const [temp, id] of extra.categoryAdded ?? []) {
    categoryTracker.added.set(temp, makeChecklistCategory({ id }));
  }
  const itemTracker = createSyncTracker<ChecklistItem>();
  for (const [temp, id] of extra.itemAdded ?? []) {
    itemTracker.added.set(temp, makeChecklistItem({ id }));
  }
  return syncChecklistOrder({
    tripId: 7,
    originals,
    edited,
    itemsAfterMoves:
      extra.itemsAfterMoves ??
      new Map(originals.map(cat => [cat.id, cat.items])),
    resolveCatId: id => categoryTracker.added.get(id)?.id ?? id,
    categoryTracker,
    itemTracker,
  });
}

describe('syncChecklistOrder', () => {
  beforeEach(() => {
    vi.mocked(reorderTripCategories).mockReset();
    vi.mocked(reorderTripItems).mockReset();
  });

  it('sends nothing when every order already matches the server', async () => {
    await run([
      { id: 1, name: 'One', items: [editItem(10), editItem(11)] },
      { id: 2, name: 'Two', items: [editItem(20)] },
    ]);

    expect(reorderTripItems).not.toHaveBeenCalled();
    expect(reorderTripCategories).not.toHaveBeenCalled();
  });

  it('reorders the items of a category whose items were rearranged', async () => {
    await run([
      { id: 1, name: 'One', items: [editItem(11), editItem(10)] },
      { id: 2, name: 'Two', items: [editItem(20)] },
    ]);

    expect(reorderTripItems).toHaveBeenCalledTimes(1);
    expect(reorderTripItems).toHaveBeenCalledWith(7, 1, [11, 10]);
    expect(reorderTripCategories).not.toHaveBeenCalled();
  });

  it('reorders the categories after the items', async () => {
    await run([
      { id: 2, name: 'Two', items: [editItem(20)] },
      { id: 1, name: 'One', items: [editItem(10), editItem(11)] },
    ]);

    expect(reorderTripCategories).toHaveBeenCalledWith(7, [2, 1]);
    expect(reorderTripItems).not.toHaveBeenCalled();
  });

  it('ignores deleted categories and items', async () => {
    await run([
      {
        id: 1,
        name: 'One',
        items: [editItem(10), editItem(11, { _deleted: true })],
      },
      { id: 2, name: 'Two', items: [editItem(20)], _deleted: true },
    ]);

    expect(reorderTripItems).not.toHaveBeenCalled();
    expect(reorderTripCategories).not.toHaveBeenCalled();
  });

  it('resolves unsaved ids through the trackers', async () => {
    await run(
      [
        { id: -1, name: 'New', items: [editItem(-2), editItem(-3)] },
        { id: 1, name: 'One', items: [editItem(10), editItem(11)] },
        { id: 2, name: 'Two', items: [editItem(20)] },
      ],
      {
        categoryAdded: [[-1, 60]],
        itemAdded: [
          [-2, 71],
          [-3, 70],
        ],
      },
    );

    expect(reorderTripCategories).toHaveBeenCalledWith(7, [60, 1, 2]);
    expect(reorderTripItems).not.toHaveBeenCalled();
  });

  it('treats moved-in items as stored after the category original items', async () => {
    const itemsAfterMoves = new Map<number, ChecklistItem[]>([
      [1, [makeChecklistItem({ id: 11 })]],
      [2, [makeChecklistItem({ id: 20 }), makeChecklistItem({ id: 10 })]],
    ]);

    await run(
      [
        { id: 1, name: 'One', items: [editItem(11)] },
        { id: 2, name: 'Two', items: [editItem(10), editItem(20)] },
      ],
      { itemsAfterMoves },
    );

    expect(reorderTripItems).toHaveBeenCalledTimes(1);
    expect(reorderTripItems).toHaveBeenCalledWith(7, 2, [10, 20]);
  });

  it('propagates a failing reorder call so the save can be retried', async () => {
    vi.mocked(reorderTripItems).mockRejectedValueOnce(new Error('boom'));

    await expect(
      run([
        { id: 1, name: 'One', items: [editItem(11), editItem(10)] },
        { id: 2, name: 'Two', items: [editItem(20)] },
      ]),
    ).rejects.toThrow('boom');
  });
});
