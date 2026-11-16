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

const plainItem = makeChecklistItem({ id: 10, specs: [] });
const specItem = makeChecklistItem({
  id: 20,
  specs: [
    makeChecklistSpec({ id: 201 }),
    makeChecklistSpec({ id: 202 }),
    makeChecklistSpec({ id: 203 }),
  ],
});

const categories = [
  makeChecklistCategory({ id: 1, items: [plainItem] }),
  makeChecklistCategory({ id: 2, items: [specItem] }),
];

/** Builds a getter that reports `true` for the given ids in occasion 1. */
function checksFor(...ids: number[]) {
  return (occId: number, id: number) => occId === 1 && ids.includes(id);
}

describe('getItemCheckState', () => {
  const tests: {
    name: string;
    item: typeof plainItem;
    checkedItems: number[];
    checkedSpecs: number[];
    expected: CheckState;
  }[] = [
    {
      name: 'uses the item check when it has no specs (checked)',
      item: plainItem,
      checkedItems: [10],
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
      checkedItems: [20],
      checkedSpecs: [],
      expected: 'unchecked',
    },
    {
      name: 'is partial when only some specs are checked',
      item: specItem,
      checkedItems: [],
      checkedSpecs: [201],
      expected: 'partial',
    },
    {
      name: 'is checked when every spec is checked',
      item: specItem,
      checkedItems: [],
      checkedSpecs: [201, 202, 203],
      expected: 'checked',
    },
    {
      name: 'treats undefined specs as no specs',
      item: { ...plainItem, specs: undefined } as unknown as typeof plainItem,
      checkedItems: [10],
      checkedSpecs: [],
      expected: 'checked',
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
      getItemCheckState(specItem, 2, checksFor(), checksFor(201, 202, 203)),
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
  ])('counts $expected for $name', ({ input, expected }) => {
    expect(countCheckUnits(input)).toBe(expected);
  });
});

describe('countCheckedUnits', () => {
  it.each([
    { name: 'nothing checked', items: [], specs: [], expected: 0 },
    { name: 'the plain item only', items: [10], specs: [], expected: 1 },
    { name: 'some specs only', items: [], specs: [201, 202], expected: 2 },
    {
      name: 'everything',
      items: [10],
      specs: [201, 202, 203],
      expected: 4,
    },
    {
      name: 'an item check on an item with specs is ignored',
      items: [20],
      specs: [],
      expected: 0,
    },
  ])('counts $expected when $name is checked', ({ items, specs, expected }) => {
    expect(
      countCheckedUnits(
        categories,
        1,
        checksFor(...items),
        checksFor(...specs),
      ),
    ).toBe(expected);
  });
});
