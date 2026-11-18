import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS } from '@/components/Checklist/locations/locationLabelSet';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import type { ChecklistCategory } from '@/types';

import { NO_HIDDEN_KEYS } from './checklistFilter';
import { unitKey, type UnitVisibility } from './incompleteFilter';
import {
  getDisplayedUnits,
  getVisibleCategories,
  getVisibleStorageGroups,
} from './visibleRows';

const categories: ChecklistCategory[] = [
  makeChecklistCategory({
    id: 1,
    name: 'Clothes',
    items: [
      makeChecklistItem({ id: 10, name: 'Jacket', storage_location: '託運' }),
      makeChecklistItem({ id: 11, name: 'Socks' }),
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
          makeChecklistSpec({ id: 201, storage_location: '隨身' }),
          makeChecklistSpec({ id: 202, storage_location: '託運,隨身' }),
        ],
      }),
    ],
  }),
];

function visibleKeys(...keys: string[]): UnitVisibility {
  const visible = new Set(keys);
  return unit => visible.has(unitKey(unit));
}

describe('getVisibleCategories', () => {
  it.each([
    {
      name: 'keeps everything without a filter',
      hidden: [] as string[],
      isUnitVisible: undefined,
      expected: [
        { id: 1, items: [10, 11] },
        { id: 2, items: [20] },
      ],
    },
    {
      name: 'applies the item filter',
      hidden: ['10|1'],
      isUnitVisible: undefined,
      expected: [
        { id: 1, items: [11] },
        { id: 2, items: [20] },
      ],
    },
    {
      name: 'applies the unit visibility after the item filter',
      hidden: ['11|1'],
      isUnitVisible: visibleKeys('item-11|', 'spec-201|隨身'),
      expected: [{ id: 2, items: [20] }],
    },
  ])('$name', ({ hidden, isUnitVisible, expected }) => {
    const result = getVisibleCategories(
      categories,
      new Set(hidden),
      isUnitVisible,
    );

    expect(
      result.map(category => ({
        id: category.id,
        items: category.items.map(item => item.id),
      })),
    ).toEqual(expected);
  });
});

describe('getVisibleStorageGroups', () => {
  it('applies the item filter and the unit visibility to the groups', () => {
    const result = getVisibleStorageGroups(
      categories,
      DEFAULT_LABELS,
      new Set(['10|託運']),
      visibleKeys('item-10|託運', 'spec-202|託運', 'spec-202|隨身'),
    );

    expect(
      result.map(group => ({
        key: group.key,
        units: group.units.map(unit => unitKey(unit)),
      })),
    ).toEqual([
      { key: '託運', units: ['spec-202|託運'] },
      { key: '隨身', units: ['spec-202|隨身'] },
    ]);
  });
});

describe('getDisplayedUnits', () => {
  it.each([
    {
      name: 'lists every unit in the category view without a filter',
      viewMode: 'category' as const,
      hidden: [] as string[],
      isUnitVisible: undefined,
      expected: [
        'item-10|託運',
        'item-11|',
        'spec-201|隨身',
        'spec-202|託運',
        'spec-202|隨身',
      ],
    },
    {
      name: 'lists only visible units of shown items in the category view',
      viewMode: 'category' as const,
      hidden: ['11|1'],
      isUnitVisible: visibleKeys('item-10|託運', 'item-11|', 'spec-202|隨身'),
      expected: ['item-10|託運', 'spec-202|隨身'],
    },
    {
      name: 'lists the units of the groups in the storage view',
      viewMode: 'storage' as const,
      hidden: ['10|託運'],
      isUnitVisible: undefined,
      expected: [
        'spec-202|託運',
        'spec-201|隨身',
        'spec-202|隨身',
        'item-11|',
      ],
    },
  ])('$name', ({ viewMode, hidden, isUnitVisible, expected }) => {
    const units = getDisplayedUnits(
      viewMode,
      categories,
      DEFAULT_LABELS,
      new Set(hidden),
      isUnitVisible,
    );

    expect(units.map(unit => unitKey(unit))).toEqual(expected);
  });

  it('lists each unit once even without a filter object', () => {
    const units = getDisplayedUnits(
      'storage',
      categories,
      DEFAULT_LABELS,
      NO_HIDDEN_KEYS,
    );

    expect(units).toHaveLength(5);
  });
});
