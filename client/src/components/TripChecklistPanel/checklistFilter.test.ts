import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS } from '@/components/Checklist/locations/locationLabelSet';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import type { ChecklistCategory } from '@/types';

import {
  buildCategoryFilterGroups,
  buildStorageFilterGroups,
  filterCategories,
  filterStorageGroups,
  groupState,
  hiddenCount,
  hiddenKey,
  isHidden,
  NO_HIDDEN_KEYS,
  toggleGroup,
  toggleItem,
  type FilterGroup,
} from './checklistFilter';
import { groupByStorage } from './groupByStorage';

const categories: ChecklistCategory[] = [
  makeChecklistCategory({
    id: 1,
    name: 'Clothes',
    items: [
      makeChecklistItem({ id: 10, name: 'Jacket', storage_location: '託運' }),
      makeChecklistItem({
        id: 11,
        name: 'Shirt',
        storage_location: '託運,隨身',
      }),
    ],
  }),
  makeChecklistCategory({
    id: 2,
    name: 'Gadgets',
    items: [
      makeChecklistItem({
        id: 20,
        name: 'Charger',
        specs: [
          makeChecklistSpec({ id: 1, name: 'USB-C', storage_location: '隨身' }),
          makeChecklistSpec({
            id: 2,
            name: 'Lightning',
            storage_location: '隨身',
          }),
        ],
      }),
      makeChecklistItem({ id: 21, name: 'Camera' }),
    ],
  }),
  makeChecklistCategory({ id: 3, name: 'Empty' }),
];

const group: FilterGroup = {
  key: '1',
  label: 'Clothes',
  items: [
    { id: 10, name: 'Jacket' },
    { id: 11, name: 'Shirt' },
  ],
};

describe('hiddenKey', () => {
  it.each([
    { groupKey: '1', itemId: 10, expected: '10|1' },
    { groupKey: '託運', itemId: 7, expected: '7|託運' },
    { groupKey: '', itemId: 7, expected: '7|' },
  ])('builds $expected', ({ groupKey, itemId, expected }) => {
    expect(hiddenKey(groupKey, itemId)).toBe(expected);
  });
});

describe('buildCategoryFilterGroups', () => {
  it('lists every category with its items in order', () => {
    expect(buildCategoryFilterGroups(categories)).toEqual([
      {
        key: '1',
        label: 'Clothes',
        items: [
          { id: 10, name: 'Jacket' },
          { id: 11, name: 'Shirt' },
        ],
      },
      {
        key: '2',
        label: 'Gadgets',
        items: [
          { id: 20, name: 'Charger' },
          { id: 21, name: 'Camera' },
        ],
      },
      { key: '3', label: 'Empty', items: [] },
    ]);
  });
});

describe('buildStorageFilterGroups', () => {
  it('lists each item once per group and labels the no-location group', () => {
    const groups = buildStorageFilterGroups(
      groupByStorage(categories, DEFAULT_LABELS),
    );

    expect(groups).toEqual([
      {
        key: '託運',
        label: '託運',
        items: [
          { id: 10, name: 'Jacket' },
          { id: 11, name: 'Shirt' },
        ],
      },
      {
        key: '隨身',
        label: '隨身',
        items: [
          { id: 11, name: 'Shirt' },
          { id: 20, name: 'Charger' },
        ],
      },
      { key: '', label: '未指定存放位置', items: [{ id: 21, name: 'Camera' }] },
    ]);
  });
});

describe('isHidden and toggleItem', () => {
  it.each([
    {
      name: 'hides a visible item',
      hidden: [] as string[],
      expected: ['10|1'],
    },
    {
      name: 'shows a hidden item again',
      hidden: ['10|1'],
      expected: [],
    },
    {
      name: 'keeps the same item hidden in other groups',
      hidden: ['10|1', '10|2'],
      expected: ['10|2'],
    },
  ])('$name', ({ hidden, expected }) => {
    const input = new Set(hidden);

    const next = toggleItem(input, '1', 10);

    expect([...next]).toEqual(expected);
    expect(input.size).toBe(hidden.length);
    expect(isHidden(next, '1', 10)).toBe(expected.includes('10|1'));
  });
});

describe('groupState', () => {
  it.each([
    { name: 'all when nothing is hidden', hidden: [], expected: 'all' },
    { name: 'some when one is hidden', hidden: ['10|1'], expected: 'some' },
    {
      name: 'none when every item is hidden',
      hidden: ['10|1', '11|1'],
      expected: 'none',
    },
    {
      name: 'ignores keys of other groups',
      hidden: ['10|2', '11|2'],
      expected: 'all',
    },
  ])('is $name', ({ hidden, expected }) => {
    expect(groupState(new Set(hidden), group)).toBe(expected);
  });

  it('treats a group without items as all visible', () => {
    expect(
      groupState(NO_HIDDEN_KEYS, { key: '3', label: 'Empty', items: [] }),
    ).toBe('all');
  });
});

describe('toggleGroup', () => {
  it.each([
    {
      name: 'hides every item when all are visible',
      hidden: [] as string[],
      expected: ['10|1', '11|1'],
    },
    {
      name: 'shows every item when some are hidden',
      hidden: ['10|1'],
      expected: [],
    },
    {
      name: 'shows every item when all are hidden',
      hidden: ['10|1', '11|1'],
      expected: [],
    },
    {
      name: 'leaves other groups untouched',
      hidden: ['10|2'],
      expected: ['10|2', '10|1', '11|1'],
    },
  ])('$name', ({ hidden, expected }) => {
    const input = new Set(hidden);

    const next = toggleGroup(input, group);

    expect([...next].sort()).toEqual([...expected].sort());
    expect(input.size).toBe(hidden.length);
  });
});

describe('hiddenCount', () => {
  const groups = buildCategoryFilterGroups(categories);

  it.each([
    { name: 'counts nothing by default', hidden: [] as string[], expected: 0 },
    { name: 'counts hidden items', hidden: ['10|1', '21|2'], expected: 2 },
    {
      name: 'ignores keys of items that are no longer listed',
      hidden: ['99|1', '10|9'],
      expected: 0,
    },
  ])('$name', ({ hidden, expected }) => {
    expect(hiddenCount(new Set(hidden), groups)).toBe(expected);
  });
});

describe('filterCategories', () => {
  it('returns the same array when nothing is hidden', () => {
    expect(filterCategories(categories, NO_HIDDEN_KEYS)).toBe(categories);
  });

  it.each([
    {
      name: 'removes a hidden item',
      hidden: ['10|1'],
      expected: [
        { id: 1, items: [11] },
        { id: 2, items: [20, 21] },
      ],
    },
    {
      name: 'drops a category whose items are all hidden',
      hidden: ['10|1', '11|1'],
      expected: [{ id: 2, items: [20, 21] }],
    },
    {
      name: 'ignores keys of another group',
      hidden: ['10|2'],
      expected: [
        { id: 1, items: [10, 11] },
        { id: 2, items: [20, 21] },
      ],
    },
  ])('$name', ({ hidden, expected }) => {
    const result = filterCategories(categories, new Set(hidden));

    expect(
      result.map(category => ({
        id: category.id,
        items: category.items.map(item => item.id),
      })),
    ).toEqual(expected);
  });

  it('keeps the specs of a visible item', () => {
    const result = filterCategories(categories, new Set(['21|2']));

    expect(result[1].items[0].specs).toHaveLength(2);
  });
});

describe('filterStorageGroups', () => {
  const groups = groupByStorage(categories, DEFAULT_LABELS);

  it('returns the same array when nothing is hidden', () => {
    expect(filterStorageGroups(groups, NO_HIDDEN_KEYS)).toBe(groups);
  });

  it.each([
    {
      name: 'hides an item only in the given group',
      hidden: ['11|託運'],
      expected: [
        { key: '託運', items: [10] },
        { key: '隨身', items: [11, 20, 20] },
        { key: '', items: [21] },
      ],
    },
    {
      name: 'hides all units of an item with several specs',
      hidden: ['20|隨身'],
      expected: [
        { key: '託運', items: [10, 11] },
        { key: '隨身', items: [11] },
        { key: '', items: [21] },
      ],
    },
    {
      name: 'drops a group without visible units',
      hidden: ['21|'],
      expected: [
        { key: '託運', items: [10, 11] },
        { key: '隨身', items: [11, 20, 20] },
      ],
    },
  ])('$name', ({ hidden, expected }) => {
    const result = filterStorageGroups(groups, new Set(hidden));

    expect(
      result.map(storageGroup => ({
        key: storageGroup.key,
        items: storageGroup.units.map(unit => unit.item.id),
      })),
    ).toEqual(expected);
  });
});
