import { describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';

import {
  getCheckCellLabel,
  getCheckUnits,
  getItemUnits,
  getSpecLocations,
  getSpecUnits,
  isUnitChecked,
  type CheckUnit,
} from './checkUnits';

/** Summarizes units as `item:<id>@<location>` / `spec:<id>@<location>`. */
function summarize(units: CheckUnit[]): string[] {
  return units.map(unit =>
    unit.kind === 'item'
      ? `item:${unit.item.id}@${unit.location}`
      : `spec:${unit.spec.id}@${unit.location}`,
  );
}

describe('getSpecLocations', () => {
  const tests = [
    {
      name: 'uses the spec location',
      specLocation: '隨身',
      expected: ['隨身'],
    },
    {
      name: 'lists several spec locations in stored order',
      specLocation: '隨身,託運',
      expected: ['隨身', '託運'],
    },
    {
      name: 'falls back to no location when the spec has none',
      specLocation: null,
      expected: [''],
    },
    {
      name: 'treats an empty string as no location',
      specLocation: '',
      expected: [''],
    },
    {
      name: 'keeps names that are not default labels',
      specLocation: '後背包',
      expected: ['後背包'],
    },
  ];

  it.each(tests)('$name', ({ specLocation, expected }) => {
    const spec = makeChecklistSpec({ storage_location: specLocation });

    expect(getSpecLocations(spec)).toEqual(expected);
  });

  it('never follows the location of the item', () => {
    const spec = makeChecklistSpec({ storage_location: null });
    makeChecklistItem({ storage_location: '託運,隨身', specs: [spec] });

    expect(getSpecLocations(spec)).toEqual(['']);
  });
});

describe('getSpecUnits', () => {
  const tests = [
    {
      name: 'yields one unit for a spec with a single own location',
      itemLocation: '託運',
      specLocation: '隨身',
      expected: ['spec:10@隨身'],
    },
    {
      name: 'yields one unit per own location in stored order',
      itemLocation: null,
      specLocation: '隨身,託運',
      expected: ['spec:10@隨身', 'spec:10@託運'],
    },
    {
      name: 'ignores the item location when the spec has none',
      itemLocation: '託運,隨身',
      specLocation: null,
      expected: ['spec:10@'],
    },
    {
      name: 'yields one unit without location when neither has one',
      itemLocation: null,
      specLocation: null,
      expected: ['spec:10@'],
    },
  ];

  it.each(tests)('$name', ({ itemLocation, specLocation, expected }) => {
    const spec = makeChecklistSpec({ id: 10, storage_location: specLocation });
    const item = makeChecklistItem({
      id: 1,
      storage_location: itemLocation,
      specs: [spec],
    });

    expect(summarize(getSpecUnits(item, spec))).toEqual(expected);
  });

  it('references the original item and spec objects on each unit', () => {
    const spec = makeChecklistSpec({ id: 10 });
    const item = makeChecklistItem({ id: 1, specs: [spec] });

    expect(getSpecUnits(item, spec)).toEqual([
      { kind: 'spec', item, spec, location: '' },
    ]);
  });
});

describe('getItemUnits', () => {
  const tests = [
    {
      name: 'an item without specs or location yields one unit without location',
      item: makeChecklistItem({ id: 1 }),
      expected: ['item:1@'],
    },
    {
      name: 'an item without specs yields one unit per location',
      item: makeChecklistItem({ id: 1, storage_location: '隨身,託運' }),
      expected: ['item:1@隨身', 'item:1@託運'],
    },
    {
      name: 'undefined specs are treated as no specs',
      item: {
        ...makeChecklistItem({ id: 1, storage_location: '託運' }),
        specs: undefined,
      } as unknown as ReturnType<typeof makeChecklistItem>,
      expected: ['item:1@託運'],
    },
    {
      name: 'an item with specs yields spec units only, never an item unit',
      item: makeChecklistItem({
        id: 1,
        specs: [makeChecklistSpec({ id: 10, storage_location: '託運' })],
      }),
      expected: ['spec:10@託運'],
    },
    {
      name: 'the own location of an item with specs is ignored',
      item: makeChecklistItem({
        id: 1,
        storage_location: '託運,隨身',
        specs: [makeChecklistSpec({ id: 10, storage_location: null })],
      }),
      expected: ['spec:10@'],
    },
    {
      name: 'specs expand per own location only',
      item: makeChecklistItem({
        id: 1,
        storage_location: '隨身',
        specs: [
          makeChecklistSpec({ id: 10, storage_location: '託運,隨身' }),
          makeChecklistSpec({ id: 11, storage_location: '隨身' }),
          makeChecklistSpec({ id: 12, storage_location: null }),
          makeChecklistSpec({ id: 13, storage_location: '' }),
        ],
      }),
      expected: [
        'spec:10@託運',
        'spec:10@隨身',
        'spec:11@隨身',
        'spec:12@',
        'spec:13@',
      ],
    },
  ];

  it.each(tests)('$name', ({ item, expected }) => {
    expect(summarize(getItemUnits(item))).toEqual(expected);
  });

  it('references the original item and spec objects on each unit', () => {
    const spec = makeChecklistSpec({ id: 10 });
    const item = makeChecklistItem({ id: 1, specs: [spec] });

    const [unit] = getItemUnits(item);

    expect(unit).toMatchObject({ kind: 'spec', item, spec, location: '' });
  });
});

describe('getCheckUnits', () => {
  it.each([
    { name: 'no categories', categories: [], expected: [] },
    {
      name: 'a category without items',
      categories: [makeChecklistCategory({ items: [] })],
      expected: [],
    },
    {
      name: 'several categories, keeping category then item order',
      categories: [
        makeChecklistCategory({
          id: 1,
          items: [
            makeChecklistItem({ id: 1, storage_location: '託運,隨身' }),
            makeChecklistItem({
              id: 2,
              specs: [makeChecklistSpec({ id: 20, storage_location: '隨身' })],
            }),
          ],
        }),
        makeChecklistCategory({
          id: 2,
          items: [makeChecklistItem({ id: 3 })],
        }),
      ],
      expected: ['item:1@託運', 'item:1@隨身', 'spec:20@隨身', 'item:3@'],
    },
  ])('flattens $name', ({ categories, expected }) => {
    expect(summarize(getCheckUnits(categories))).toEqual(expected);
  });
});

describe('isUnitChecked', () => {
  const item = makeChecklistItem({ id: 5 });
  const spec = makeChecklistSpec({ id: 50 });

  const tests: {
    name: string;
    unit: CheckUnit;
    itemResult: boolean;
    specResult: boolean;
    expected: boolean;
    expectedCall: 'item' | 'spec';
    expectedArgs: [number, number, string];
  }[] = [
    {
      name: 'reads the item getter for an item unit',
      unit: { kind: 'item', item, location: '託運' },
      itemResult: true,
      specResult: false,
      expected: true,
      expectedCall: 'item',
      expectedArgs: [1, 5, '託運'],
    },
    {
      name: 'ignores the spec getter for an item unit',
      unit: { kind: 'item', item, location: '託運' },
      itemResult: false,
      specResult: true,
      expected: false,
      expectedCall: 'item',
      expectedArgs: [1, 5, '託運'],
    },
    {
      name: 'reads the spec getter for a spec unit',
      unit: { kind: 'spec', item, spec, location: '隨身' },
      itemResult: false,
      specResult: true,
      expected: true,
      expectedCall: 'spec',
      expectedArgs: [1, 50, '隨身'],
    },
    {
      name: 'passes the empty location through for a unit without one',
      unit: { kind: 'spec', item, spec, location: '' },
      itemResult: true,
      specResult: false,
      expected: false,
      expectedCall: 'spec',
      expectedArgs: [1, 50, ''],
    },
  ];

  it.each(tests)(
    '$name',
    ({
      unit,
      itemResult,
      specResult,
      expected,
      expectedCall,
      expectedArgs,
    }) => {
      const getCheck = vi.fn().mockReturnValue(itemResult);
      const getSpecCheck = vi.fn().mockReturnValue(specResult);

      expect(isUnitChecked(unit, 1, getCheck, getSpecCheck)).toBe(expected);

      const called = expectedCall === 'item' ? getCheck : getSpecCheck;
      const other = expectedCall === 'item' ? getSpecCheck : getCheck;
      expect(called).toHaveBeenCalledWith(...expectedArgs);
      expect(other).not.toHaveBeenCalled();
    },
  );
});

describe('getCheckCellLabel', () => {
  it.each([
    {
      name: 'appends the location to the name',
      name_: '外套',
      location: '託運',
      expected: '外套（託運） - 出發',
    },
    {
      name: 'omits the location when there is none',
      name_: '外套',
      location: '',
      expected: '外套 - 出發',
    },
  ])('$name', ({ name_, location, expected }) => {
    expect(getCheckCellLabel(name_, location, '出發')).toBe(expected);
  });
});
