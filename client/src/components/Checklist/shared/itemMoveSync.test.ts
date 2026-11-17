import { describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import type { ChecklistCategory } from '@/types';

import { createSyncTracker } from './checklistDiffSync';
import {
  applyItemMoves,
  itemsAfterMoves,
  type ItemMove,
  planItemMoves,
} from './itemMoveSync';
import type { EditCategory, EditItem } from './types';

const itemA = makeChecklistItem({ id: 10, name: 'A' });
const itemB = makeChecklistItem({ id: 11, name: 'B' });
const itemC = makeChecklistItem({ id: 20, name: 'C' });

function originals(): ChecklistCategory[] {
  return [
    makeChecklistCategory({ id: 1, name: 'One', items: [itemA, itemB] }),
    makeChecklistCategory({ id: 2, name: 'Two', items: [itemC] }),
  ];
}

function editItem(
  item: { id: number; name: string },
  extra: Partial<EditItem> = {},
): EditItem {
  return {
    id: item.id,
    name: item.name,
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...extra,
  };
}

describe('planItemMoves', () => {
  it.each<{
    description: string;
    edited: EditCategory[];
    expected: Array<[itemId: number, from: number, to: number]>;
  }>([
    {
      description: 'nothing changed category',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemA), editItem(itemB)] },
        { id: 2, name: 'Two', items: [editItem(itemC)] },
      ],
      expected: [],
    },
    {
      description: 'a saved item sits in another category',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemB)] },
        { id: 2, name: 'Two', items: [editItem(itemC), editItem(itemA)] },
      ],
      expected: [[10, 1, 2]],
    },
    {
      description: 'a saved item sits in an unsaved category',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemB)] },
        { id: 2, name: 'Two', items: [editItem(itemC)] },
        { id: -1, name: 'New', items: [editItem(itemA)] },
      ],
      expected: [[10, 1, -1]],
    },
    {
      description: 'the moved item was then deleted',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemB)] },
        {
          id: 2,
          name: 'Two',
          items: [editItem(itemC), editItem(itemA, { _deleted: true })],
        },
      ],
      expected: [],
    },
    {
      description: 'the target category was deleted',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemB)] },
        {
          id: 2,
          name: 'Two',
          items: [editItem(itemC), editItem(itemA)],
          _deleted: true,
        },
      ],
      expected: [],
    },
    {
      description: 'an unsaved item is added to another category',
      edited: [
        { id: 1, name: 'One', items: [editItem(itemA), editItem(itemB)] },
        {
          id: 2,
          name: 'Two',
          items: [editItem(itemC), editItem({ id: -5, name: 'New' })],
        },
      ],
      expected: [],
    },
  ])('finds the right moves when $description', ({ edited, expected }) => {
    const moves = planItemMoves(originals(), edited);

    expect(moves.map(m => [m.item.id, m.fromCatId, m.toCatId])).toEqual(
      expected,
    );
  });

  it('returns the originally loaded item so later diffs compare against it', () => {
    const edited: EditCategory[] = [
      { id: 1, name: 'One', items: [editItem(itemB)] },
      {
        id: 2,
        name: 'Two',
        items: [editItem(itemC), editItem(itemA, { name: 'Renamed' })],
      },
    ];

    expect(planItemMoves(originals(), edited)[0].item).toBe(itemA);
  });
});

describe('itemsAfterMoves', () => {
  it('removes moved items from their source and appends them to the target', () => {
    const moves: ItemMove[] = [{ item: itemA, fromCatId: 1, toCatId: 2 }];

    const result = itemsAfterMoves(originals(), moves, id => id);

    expect(result.get(1)).toEqual([itemB]);
    expect(result.get(2)).toEqual([itemC, itemA]);
  });

  it('files items moved into an unsaved category under its saved id', () => {
    const moves: ItemMove[] = [{ item: itemA, fromCatId: 1, toCatId: -1 }];

    const result = itemsAfterMoves(originals(), moves, id =>
      id === -1 ? 60 : id,
    );

    expect(result.get(60)).toEqual([itemA]);
    expect(result.get(1)).toEqual([itemB]);
  });

  it('keeps categories without moves untouched', () => {
    const result = itemsAfterMoves(originals(), [], id => id);

    expect(result.get(1)).toEqual([itemA, itemB]);
    expect(result.get(2)).toEqual([itemC]);
  });
});

describe('applyItemMoves', () => {
  function makeIo(overrides: { moved?: Set<number> } = {}) {
    return {
      editedCategories: [
        { id: -1, name: ' New ', items: [] },
      ] as EditCategory[],
      categoryTracker: createSyncTracker<ChecklistCategory>(),
      movedItemIds: overrides.moved ?? new Set<number>(),
      createCategory: vi.fn(async () =>
        makeChecklistCategory({ id: 60, name: 'New' }),
      ),
      moveItem: vi.fn(async () => undefined),
    };
  }

  it('moves items into saved categories without creating anything', async () => {
    const io = makeIo();

    const resolve = await applyItemMoves(
      [{ item: itemA, fromCatId: 1, toCatId: 2 }],
      io,
    );

    expect(io.createCategory).not.toHaveBeenCalled();
    expect(io.moveItem).toHaveBeenCalledWith(10, 2);
    expect(io.movedItemIds.has(10)).toBe(true);
    expect(resolve(2)).toBe(2);
  });

  it('creates an unsaved target once and moves every item into it', async () => {
    const io = makeIo();

    const resolve = await applyItemMoves(
      [
        { item: itemA, fromCatId: 1, toCatId: -1 },
        { item: itemB, fromCatId: 1, toCatId: -1 },
      ],
      io,
    );

    expect(io.createCategory).toHaveBeenCalledTimes(1);
    expect(io.moveItem.mock.calls).toEqual([
      [10, 60],
      [11, 60],
    ]);
    expect(io.categoryTracker.added.get(-1)?.id).toBe(60);
    expect(resolve(-1)).toBe(60);
  });

  it('skips moves and targets that already succeeded in an earlier attempt', async () => {
    const io = makeIo({ moved: new Set([10]) });
    io.categoryTracker.added.set(
      -1,
      makeChecklistCategory({ id: 60, name: 'New' }),
    );

    await applyItemMoves(
      [
        { item: itemA, fromCatId: 1, toCatId: -1 },
        { item: itemB, fromCatId: 1, toCatId: -1 },
      ],
      io,
    );

    expect(io.createCategory).not.toHaveBeenCalled();
    expect(io.moveItem.mock.calls).toEqual([[11, 60]]);
  });

  it('does not mark an item as moved when the move call fails', async () => {
    const io = makeIo();
    io.moveItem.mockRejectedValueOnce(new Error('boom'));

    await expect(
      applyItemMoves([{ item: itemA, fromCatId: 1, toCatId: 2 }], io),
    ).rejects.toThrow('boom');

    expect(io.movedItemIds.has(10)).toBe(false);
  });
});
