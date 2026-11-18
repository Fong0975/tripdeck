import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS } from '@/components/Checklist/locations/locationLabelSet';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import type { ChecklistCategory, ChecklistOccasion } from '@/types';

import { getItemUnits, type CheckGetter } from './checkUnits';
import { groupByStorage } from './groupByStorage';
import {
  createUnfinishedVisibility,
  filterCategoriesByUnits,
  filterStorageGroupsByUnits,
  isUnitUnfinished,
  unitKey,
  unitKeyOf,
} from './incompleteFilter';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Out', checks: {}, specChecks: {} },
  { id: 2, name: 'Back', checks: {}, specChecks: {} },
];

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
          makeChecklistSpec({
            id: 201,
            name: 'USB-C',
            storage_location: '隨身',
          }),
          makeChecklistSpec({
            id: 202,
            name: 'Lightning',
            storage_location: '託運',
          }),
        ],
      }),
    ],
  }),
];

/** Builds getters from `occId:id:location` entries of checked cells. */
function getters(items: string[] = [], specs: string[] = []) {
  const read =
    (checked: Set<string>): CheckGetter =>
    (occId, id, location) =>
      checked.has(`${occId}:${id}:${location}`);
  return { getCheck: read(new Set(items)), getSpecCheck: read(new Set(specs)) };
}

const jacket = getItemUnits(categories[0].items[0])[0];
const lightning = getItemUnits(categories[1].items[0])[1];

describe('unitKey', () => {
  it.each([
    { name: 'an item unit', unit: jacket, expected: 'item-10|託運' },
    { name: 'a spec unit', unit: lightning, expected: 'spec-202|託運' },
  ])('builds the key of $name', ({ unit, expected }) => {
    expect(unitKey(unit)).toBe(expected);
  });

  it.each([
    {
      kind: 'item' as const,
      id: 10,
      location: '託運',
      expected: 'item-10|託運',
    },
    { kind: 'spec' as const, id: 202, location: '', expected: 'spec-202|' },
  ])('unitKeyOf builds $expected', ({ kind, id, location, expected }) => {
    expect(unitKeyOf(kind, id, location)).toBe(expected);
  });
});

describe('isUnitUnfinished', () => {
  it.each([
    { name: 'nothing is checked', items: [], expected: true },
    {
      name: 'only one occasion is checked',
      items: ['1:10:託運'],
      expected: true,
    },
    {
      name: 'every occasion is checked',
      items: ['1:10:託運', '2:10:託運'],
      expected: false,
    },
    {
      name: 'the checks belong to another location',
      items: ['1:10:隨身', '2:10:隨身'],
      expected: true,
    },
  ])('is $expected when $name', ({ items, expected }) => {
    const { getCheck, getSpecCheck } = getters(items);

    expect(isUnitUnfinished(jacket, occasions, getCheck, getSpecCheck)).toBe(
      expected,
    );
  });

  it('reads spec checks for a spec unit', () => {
    const { getCheck, getSpecCheck } = getters(
      [],
      ['1:202:託運', '2:202:託運'],
    );

    expect(isUnitUnfinished(lightning, occasions, getCheck, getSpecCheck)).toBe(
      false,
    );
  });

  it('treats every unit as unfinished without occasions', () => {
    const { getCheck, getSpecCheck } = getters(['1:10:託運']);

    expect(isUnitUnfinished(jacket, [], getCheck, getSpecCheck)).toBe(true);
  });
});

describe('createUnfinishedVisibility', () => {
  const done = getters(['1:10:託運', '2:10:託運']);

  it.each([
    {
      name: 'hides a finished unit',
      lingering: [] as string[],
      expected: false,
    },
    {
      name: 'keeps a finished unit that is lingering',
      lingering: ['item-10|託運'],
      expected: true,
    },
    {
      name: 'ignores lingering keys of other units',
      lingering: ['item-11|'],
      expected: false,
    },
  ])('$name', ({ lingering, expected }) => {
    const isVisible = createUnfinishedVisibility(
      occasions,
      done.getCheck,
      done.getSpecCheck,
      new Set(lingering),
    );

    expect(isVisible(jacket)).toBe(expected);
  });

  it('shows an unfinished unit', () => {
    const isVisible = createUnfinishedVisibility(
      occasions,
      () => false,
      () => false,
      new Set(),
    );

    expect(isVisible(jacket)).toBe(true);
  });
});

describe('filterCategoriesByUnits', () => {
  function visibleIds(
    items: string[],
    specs: string[],
  ): { id: number; items: number[] }[] {
    const { getCheck, getSpecCheck } = getters(items, specs);
    const isVisible = createUnfinishedVisibility(
      occasions,
      getCheck,
      getSpecCheck,
      new Set(),
    );
    return filterCategoriesByUnits(categories, isVisible).map(category => ({
      id: category.id,
      items: category.items.map(item => item.id),
    }));
  }

  it.each([
    {
      name: 'keeps everything when nothing is checked',
      items: [],
      specs: [],
      expected: [
        { id: 1, items: [10, 11] },
        { id: 2, items: [20] },
      ],
    },
    {
      name: 'drops a finished item',
      items: ['1:10:託運', '2:10:託運'],
      specs: [],
      expected: [
        { id: 1, items: [11] },
        { id: 2, items: [20] },
      ],
    },
    {
      name: 'keeps an item while one of its specs is unfinished',
      items: [],
      specs: ['1:201:隨身', '2:201:隨身'],
      expected: [
        { id: 1, items: [10, 11] },
        { id: 2, items: [20] },
      ],
    },
    {
      name: 'drops an item whose specs are all finished, and its category',
      items: [],
      specs: ['1:201:隨身', '2:201:隨身', '1:202:託運', '2:202:託運'],
      expected: [{ id: 1, items: [10, 11] }],
    },
  ])('$name', ({ items, specs, expected }) => {
    expect(visibleIds(items, specs)).toEqual(expected);
  });
});

describe('filterStorageGroupsByUnits', () => {
  it('drops finished units and the groups left empty', () => {
    const { getCheck, getSpecCheck } = getters(
      ['1:10:託運', '2:10:託運', '1:11:', '2:11:'],
      ['1:202:託運', '2:202:託運'],
    );
    const isVisible = createUnfinishedVisibility(
      occasions,
      getCheck,
      getSpecCheck,
      new Set(),
    );

    const result = filterStorageGroupsByUnits(
      groupByStorage(categories, DEFAULT_LABELS),
      isVisible,
    );

    expect(
      result.map(group => ({
        key: group.key,
        units: group.units.map(unit => unitKey(unit)),
      })),
    ).toEqual([{ key: '隨身', units: ['spec-201|隨身'] }]);
  });
});
