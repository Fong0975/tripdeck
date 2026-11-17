import { describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import type { ChecklistCategory } from '@/types';

import {
  appendSpec,
  moveItemToCategory,
  newEditItem,
  newEditSpec,
  patchFields,
  patchSpec,
  removeOrMarkDeleted,
  removeSpecById,
  reorderById,
  scrollToBottomSoon,
  toEditCategory,
  updateById,
  updateIn,
} from './editStateUpdaters';
import type { EditCategory, EditItem, EditSpec } from './types';

function makeEditSpec(overrides: Partial<EditSpec> = {}): EditSpec {
  return { id: 100, name: 'Spec', storage_location: null, ...overrides };
}

function makeEditItem(overrides: Partial<EditItem> = {}): EditItem {
  return {
    id: 10,
    name: 'Item',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...overrides,
  };
}

function makeTree(): EditCategory[] {
  return [
    {
      id: 1,
      name: 'Cat A',
      items: [
        makeEditItem({ id: 10, specs: [makeEditSpec({ id: 100 })] }),
        makeEditItem({ id: 11, name: 'Other' }),
      ],
    },
    { id: 2, name: 'Cat B', items: [makeEditItem({ id: 20 })] },
  ];
}

describe('toEditCategory', () => {
  it.each<{
    description: string;
    category: ChecklistCategory;
    expected: EditCategory;
  }>([
    {
      description: 'copies all populated fields',
      category: makeChecklistCategory({
        id: 1,
        name: 'Cat',
        items: [
          makeChecklistItem({
            id: 10,
            name: 'Item',
            quantity: 2,
            notes: 'note',
            storage_location: '託運',
            specs: [
              makeChecklistSpec({
                id: 100,
                name: 'Spec',
                storage_location: '隨身',
              }),
            ],
          }),
        ],
      }),
      expected: {
        id: 1,
        name: 'Cat',
        items: [
          {
            id: 10,
            name: 'Item',
            quantity: 2,
            notes: 'note',
            storage_location: '託運',
            specs: [{ id: 100, name: 'Spec', storage_location: '隨身' }],
          },
        ],
      },
    },
    {
      description: 'normalises missing optional fields to null / []',
      category: {
        id: 2,
        name: 'Sparse',
        items: [{ id: 11, name: 'Bare' }],
      } as unknown as ChecklistCategory,
      expected: {
        id: 2,
        name: 'Sparse',
        items: [
          {
            id: 11,
            name: 'Bare',
            quantity: null,
            notes: null,
            storage_location: null,
            specs: [],
          },
        ],
      },
    },
    {
      description: 'handles a category without items',
      category: makeChecklistCategory({ id: 3, name: 'Empty', items: [] }),
      expected: { id: 3, name: 'Empty', items: [] },
    },
  ])('$description', ({ category, expected }) => {
    expect(toEditCategory(category)).toEqual(expected);
  });
});

describe('newEditItem / newEditSpec', () => {
  it.each([
    {
      description: 'item',
      create: newEditItem as () => { id: number },
      expectedFields: {
        name: '新項目',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      },
    },
    {
      description: 'spec',
      create: newEditSpec as () => { id: number },
      expectedFields: { name: '新規格', storage_location: null },
    },
  ])(
    'creates a new $description with a unique negative temp id',
    ({ create, expectedFields }) => {
      const first = create();
      const second = create();

      expect(first).toMatchObject(expectedFields);
      expect(first.id).toBeLessThan(0);
      expect(second.id).toBeLessThan(0);
      expect(second.id).not.toBe(first.id);
    },
  );
});

describe('updateById', () => {
  it.each([
    {
      description: 'replaces the matching entry',
      id: 2,
      expected: [{ id: 1 }, { id: 2, touched: true }, { id: 3 }],
    },
    {
      description: 'leaves the list unchanged when no id matches',
      id: 99,
      expected: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
  ])('$description', ({ id, expected }) => {
    const list: { id: number; touched?: boolean }[] = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ];

    const result = updateById(list, id, e => ({ ...e, touched: true }));

    expect(result).toEqual(expected);
    expect(result[0]).toBe(list[0]);
  });
});

describe('removeOrMarkDeleted', () => {
  it.each([
    {
      description: 'drops an unsaved (negative id) entry',
      id: -1,
      expected: [{ id: 5 }],
    },
    {
      description: 'flags a saved (positive id) entry as _deleted',
      id: 5,
      expected: [{ id: -1 }, { id: 5, _deleted: true }],
    },
  ])('$description', ({ id, expected }) => {
    expect(removeOrMarkDeleted([{ id: -1 }, { id: 5 }], id)).toEqual(expected);
  });
});

describe('item updaters', () => {
  const base = makeEditItem({
    specs: [makeEditSpec({ id: 100 }), makeEditSpec({ id: 101, name: 'B' })],
  });
  const added = makeEditSpec({ id: -50, name: 'New' });

  it.each<{
    description: string;
    updater: (item: EditItem) => EditItem;
    expected: EditItem;
  }>([
    {
      description: 'patchFields merges fields',
      updater: patchFields<EditItem>({ name: 'Renamed', quantity: 3 }),
      expected: { ...base, name: 'Renamed', quantity: 3 },
    },
    {
      description: 'appendSpec appends a spec',
      updater: appendSpec(added),
      expected: { ...base, specs: [...base.specs, added] },
    },
    {
      description: 'patchSpec merges fields into the matching spec only',
      updater: patchSpec(101, { storage_location: '託運' }),
      expected: {
        ...base,
        specs: [base.specs[0], { ...base.specs[1], storage_location: '託運' }],
      },
    },
    {
      description: 'removeSpecById drops the matching spec',
      updater: removeSpecById(100),
      expected: { ...base, specs: [base.specs[1]] },
    },
  ])('$description', ({ updater, expected }) => {
    expect(updater(base)).toEqual(expected);
  });
});

describe('updateIn', () => {
  it.each<{
    description: string;
    apply: (tree: EditCategory[]) => EditCategory[];
    expected: (tree: EditCategory[]) => EditCategory[];
  }>([
    {
      description: 'updates a category when no item id is given',
      apply: tree => updateIn(tree, 2, c => ({ ...c, name: 'Renamed' })),
      expected: tree => [tree[0], { ...tree[1], name: 'Renamed' }],
    },
    {
      description: 'updates an item inside the matching category',
      apply: tree =>
        updateIn(tree, 1, 11, i => ({ ...i, name: 'Renamed item' })),
      expected: tree => [
        {
          ...tree[0],
          items: [
            tree[0].items[0],
            { ...tree[0].items[1], name: 'Renamed item' },
          ],
        },
        tree[1],
      ],
    },
    {
      description: 'leaves the tree unchanged for an unknown category',
      apply: tree => updateIn(tree, 99, c => ({ ...c, name: 'X' })),
      expected: tree => tree,
    },
    {
      description: 'leaves items unchanged for an unknown item id',
      apply: tree => updateIn(tree, 1, 99, i => ({ ...i, name: 'X' })),
      expected: tree => tree,
    },
  ])('$description', ({ apply, expected }) => {
    const tree = makeTree();

    const result = apply(tree);

    expect(result).toEqual(expected(makeTree()));
    expect(tree).toEqual(makeTree());
  });

  it('keeps untouched nodes by reference', () => {
    const tree = makeTree();

    const result = updateIn(tree, 1, 11, i => ({ ...i, name: 'X' }));

    expect(result[1]).toBe(tree[1]);
    expect(result[0].items[0]).toBe(tree[0].items[0]);
  });
});

describe('scrollToBottomSoon', () => {
  it.each([
    {
      description: 'scrolls the element to its bottom on the next tick',
      attached: true,
      expectedCalls: [[{ top: 500, behavior: 'smooth' }]],
    },
    {
      description: 'does nothing without an element',
      attached: false,
      expectedCalls: [],
    },
  ])('$description', ({ attached, expectedCalls }) => {
    vi.useFakeTimers();
    const scrollTo = vi.fn();
    const element = { scrollHeight: 500, scrollTo } as unknown as HTMLElement;
    const ref = { current: attached ? element : null };

    scrollToBottomSoon(ref);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(scrollTo.mock.calls).toEqual(expectedCalls);
    vi.useRealTimers();
  });
});

describe('reorderById', () => {
  const list = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it.each([
    {
      description: 'moves an entry forward',
      active: 1,
      over: 3,
      expected: [2, 3, 1, 4],
    },
    {
      description: 'moves an entry backward',
      active: 4,
      over: 2,
      expected: [1, 4, 2, 3],
    },
    {
      description: 'swaps neighbours',
      active: 2,
      over: 3,
      expected: [1, 3, 2, 4],
    },
  ])('$description', ({ active, over, expected }) => {
    expect(reorderById(list, active, over).map(e => e.id)).toEqual(expected);
  });

  it.each([
    { description: 'both ids are equal', active: 2, over: 2 },
    { description: 'the active id is unknown', active: 9, over: 2 },
    { description: 'the over id is unknown', active: 2, over: 9 },
  ])('returns the same array when $description', ({ active, over }) => {
    expect(reorderById(list, active, over)).toBe(list);
  });

  it('does not mutate the input', () => {
    const copy = [...list];

    reorderById(list, 1, 4);

    expect(list).toEqual(copy);
  });
});

describe('moveItemToCategory', () => {
  function tree(): EditCategory[] {
    return [
      {
        id: 1,
        name: 'One',
        items: [makeEditItem({ id: 10 }), makeEditItem({ id: 11 })],
      },
      { id: 2, name: 'Two', items: [makeEditItem({ id: 20 })] },
      { id: 3, name: 'Three', items: [] },
    ];
  }

  it('removes the item from its category and appends it to the target', () => {
    const result = moveItemToCategory(tree(), 10, 1, 2);

    expect(result.map(c => c.items.map(i => i.id))).toEqual([
      [11],
      [20, 10],
      [],
    ]);
  });

  it('keeps untouched categories by reference', () => {
    const categories = tree();

    const result = moveItemToCategory(categories, 10, 1, 2);

    expect(result[2]).toBe(categories[2]);
  });

  it.each([
    { description: 'the categories are equal', itemId: 10, from: 1, to: 1 },
    {
      description: 'the item is not in the source category',
      itemId: 20,
      from: 1,
      to: 2,
    },
    {
      description: 'the source category does not exist',
      itemId: 10,
      from: 9,
      to: 2,
    },
  ])('returns the same tree when $description', ({ itemId, from, to }) => {
    const categories = tree();

    expect(moveItemToCategory(categories, itemId, from, to)).toBe(categories);
  });
});
