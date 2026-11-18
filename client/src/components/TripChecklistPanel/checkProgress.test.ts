import { checkKey } from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';

import {
  countCheckedUnits,
  countCheckUnits,
  getItemCheckState,
  type CheckState,
} from './checkProgress';

/** A check mark: `[id, location]`; the location defaults to none. */
type Mark = [id: number, location?: string];

const plainItem = makeChecklistItem({ id: 10, specs: [] });
const dualItem = makeChecklistItem({
  id: 11,
  storage_location: '託運,隨身',
  specs: [],
});
const specItem = makeChecklistItem({
  id: 20,
  specs: [
    makeChecklistSpec({ id: 201 }),
    makeChecklistSpec({ id: 202 }),
    makeChecklistSpec({ id: 203 }),
  ],
});
const inheritingSpecItem = makeChecklistItem({
  id: 30,
  storage_location: '託運,隨身',
  specs: [
    makeChecklistSpec({ id: 301 }),
    makeChecklistSpec({ id: 302, storage_location: '隨身' }),
  ],
});

const categories = [
  makeChecklistCategory({ id: 1, items: [plainItem] }),
  makeChecklistCategory({ id: 2, items: [specItem] }),
];

const multiLocationCategories = [
  makeChecklistCategory({ id: 1, items: [plainItem, dualItem] }),
  makeChecklistCategory({ id: 2, items: [inheritingSpecItem] }),
];

/** Builds a getter that reports `true` for the given marks in occasion 1. */
function checksFor(...marks: Mark[]) {
  const keys = marks.map(([id, location = '']) => checkKey(id, location));
  return (occId: number, id: number, location: string) =>
    occId === 1 && keys.includes(checkKey(id, location));
}

describe('getItemCheckState', () => {
  const tests: {
    name: string;
    item: typeof plainItem;
    checkedItems: Mark[];
    checkedSpecs: Mark[];
    expected: CheckState;
  }[] = [
    {
      name: 'uses the item check when it has no specs (checked)',
      item: plainItem,
      checkedItems: [[10]],
      checkedSpecs: [],
      expected: 'checked',
    },
    {
      name: 'uses the item check when it has no specs (unchecked)',
      item: plainItem,
      checkedItems: [],
      checkedSpecs: [],
      expected: 'unchecked',
    },
    {
      name: 'ignores the item check when it has specs',
      item: specItem,
      checkedItems: [[20]],
      checkedSpecs: [],
      expected: 'unchecked',
    },
    {
      name: 'is partial when only some specs are checked',
      item: specItem,
      checkedItems: [],
      checkedSpecs: [[201]],
      expected: 'partial',
    },
    {
      name: 'is checked when every spec is checked',
      item: specItem,
      checkedItems: [],
      checkedSpecs: [[201], [202], [203]],
      expected: 'checked',
    },
    {
      name: 'treats undefined specs as no specs',
      item: { ...plainItem, specs: undefined } as unknown as typeof plainItem,
      checkedItems: [[10]],
      checkedSpecs: [],
      expected: 'checked',
    },
    {
      name: 'is partial when an item without specs is checked at one of two locations',
      item: dualItem,
      checkedItems: [[11, '託運']],
      checkedSpecs: [],
      expected: 'partial',
    },
    {
      name: 'is checked when an item without specs is checked at every location',
      item: dualItem,
      checkedItems: [
        [11, '託運'],
        [11, '隨身'],
      ],
      checkedSpecs: [],
      expected: 'checked',
    },
    {
      name: 'ignores an item check at a location the item does not have',
      item: dualItem,
      checkedItems: [[11]],
      checkedSpecs: [],
      expected: 'unchecked',
    },
    {
      name: 'is partial when an inheriting spec is checked at one location only',
      item: inheritingSpecItem,
      checkedItems: [],
      checkedSpecs: [[301, '託運']],
      expected: 'partial',
    },
    {
      name: 'ignores spec checks without a location when the specs have locations',
      item: inheritingSpecItem,
      checkedItems: [],
      checkedSpecs: [[301], [302]],
      expected: 'unchecked',
    },
    {
      name: 'is checked when every spec is checked at every location it has',
      item: inheritingSpecItem,
      checkedItems: [],
      checkedSpecs: [
        [301, '託運'],
        [301, '隨身'],
        [302, '隨身'],
      ],
      expected: 'checked',
    },
    {
      name: 'is partial when the spec with its own location is the only one checked',
      item: inheritingSpecItem,
      checkedItems: [],
      checkedSpecs: [[302, '隨身']],
      expected: 'partial',
    },
  ];

  it.each(tests)('$name', ({ item, checkedItems, checkedSpecs, expected }) => {
    expect(
      getItemCheckState(
        item,
        1,
        checksFor(...checkedItems),
        checksFor(...checkedSpecs),
      ),
    ).toBe(expected);
  });

  it('only looks at the requested occasion', () => {
    expect(
      getItemCheckState(
        specItem,
        2,
        checksFor(),
        checksFor([201], [202], [203]),
      ),
    ).toBe('unchecked');
  });
});

describe('countCheckUnits', () => {
  it.each([
    { name: 'no categories', input: [], expected: 0 },
    {
      name: 'an item without specs counts once',
      input: [makeChecklistCategory({ items: [plainItem] })],
      expected: 1,
    },
    {
      name: 'an item with specs counts once per spec',
      input: [makeChecklistCategory({ items: [specItem] })],
      expected: 3,
    },
    { name: 'mixed categories', input: categories, expected: 4 },
    {
      name: 'an item without specs counts once per location',
      input: [makeChecklistCategory({ items: [dualItem] })],
      expected: 2,
    },
    {
      name: 'specs count once per location, inheriting or using their own',
      input: [makeChecklistCategory({ items: [inheritingSpecItem] })],
      expected: 3,
    },
    {
      name: 'multi-location items and specs together',
      input: multiLocationCategories,
      expected: 6,
    },
  ])('counts $expected for $name', ({ input, expected }) => {
    expect(countCheckUnits(input)).toBe(expected);
  });
});

describe('countCheckedUnits', () => {
  it.each([
    { name: 'nothing', items: [], specs: [], expected: 0 },
    { name: 'the plain item only', items: [[10]], specs: [], expected: 1 },
    {
      name: 'some specs only',
      items: [],
      specs: [[201], [202]],
      expected: 2,
    },
    {
      name: 'everything',
      items: [[10]],
      specs: [[201], [202], [203]],
      expected: 4,
    },
    {
      name: 'an item check on an item with specs (ignored)',
      items: [[20]],
      specs: [],
      expected: 0,
    },
  ] as { name: string; items: Mark[]; specs: Mark[]; expected: number }[])(
    'counts $expected when $name is checked',
    ({ items, specs, expected }) => {
      expect(
        countCheckedUnits(
          categories,
          1,
          checksFor(...items),
          checksFor(...specs),
        ),
      ).toBe(expected);
    },
  );

  it.each([
    {
      name: 'one of two locations of a plain item',
      items: [[11, '託運']],
      specs: [],
      expected: 1,
    },
    {
      name: 'both locations of a plain item count separately',
      items: [
        [11, '託運'],
        [11, '隨身'],
      ],
      specs: [],
      expected: 2,
    },
    {
      name: 'a spec at one of its two inherited locations',
      items: [],
      specs: [[301, '隨身']],
      expected: 1,
    },
    {
      name: 'every unit at every location',
      items: [[10], [11, '託運'], [11, '隨身']],
      specs: [
        [301, '託運'],
        [301, '隨身'],
        [302, '隨身'],
      ],
      expected: 6,
    },
    {
      name: 'checks at locations the unit does not have (ignored)',
      items: [[11, '後背包'], [11]],
      specs: [[302, '託運'], [301]],
      expected: 0,
    },
  ] as { name: string; items: Mark[]; specs: Mark[]; expected: number }[])(
    'counts $expected for $name',
    ({ items, specs, expected }) => {
      expect(
        countCheckedUnits(
          multiLocationCategories,
          1,
          checksFor(...items),
          checksFor(...specs),
        ),
      ).toBe(expected);
    },
  );
});
