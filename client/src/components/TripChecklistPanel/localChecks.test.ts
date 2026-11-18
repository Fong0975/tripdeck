import { describe, expect, it } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
  makeTripChecklist,
} from '@/test-utils/fixtures';

import {
  changedChecks,
  pruneLocalChecks,
  pruneLocalSpecChecks,
  type LocalChecks,
} from './localChecks';

const checklist = makeTripChecklist({
  occasions: [
    { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
    { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
  ],
  categories: [
    makeChecklistCategory({
      id: 1,
      items: [
        makeChecklistItem({ id: 10 }),
        makeChecklistItem({ id: 20, storage_location: '託運,隨身' }),
      ],
    }),
    makeChecklistCategory({
      id: 2,
      items: [makeChecklistItem({ id: 30, storage_location: '隨身' })],
    }),
  ],
});

describe('pruneLocalChecks', () => {
  const tests: { name: string; local: LocalChecks; expected: LocalChecks }[] = [
    { name: 'returns an empty map for no edits', local: {}, expected: {} },
    {
      name: 'keeps edits whose occasion, item and location all still exist',
      local: { 1: { '10|': true, '30|隨身': false }, 2: { '20|託運': true } },
      expected: {
        1: { '10|': true, '30|隨身': false },
        2: { '20|託運': true },
      },
    },
    {
      name: 'keeps the edits of every location of a multi-location item',
      local: { 1: { '20|託運': true, '20|隨身': false } },
      expected: { 1: { '20|託運': true, '20|隨身': false } },
    },
    {
      name: 'drops edits for removed items but keeps the rest',
      local: { 1: { '10|': true, '99|': true } },
      expected: { 1: { '10|': true } },
    },
    {
      name: 'drops edits at a location the item no longer has',
      local: { 1: { '30|隨身': true, '30|託運': true, '30|': true } },
      expected: { 1: { '30|隨身': true } },
    },
    {
      name: 'drops a location-less edit once the item has locations',
      local: { 1: { '20|': true, '20|託運': true } },
      expected: { 1: { '20|託運': true } },
    },
    {
      name: 'drops a legacy id-only key',
      local: { 1: { 10: true } },
      expected: {},
    },
    {
      name: 'drops every edit for a removed occasion',
      local: { 1: { '10|': true }, 3: { '20|託運': true } },
      expected: { 1: { '10|': true } },
    },
    {
      name: 'omits an occasion left with no edits',
      local: { 2: { '99|': false } },
      expected: {},
    },
  ];

  it.each(tests)('$name', ({ local, expected }) => {
    expect(pruneLocalChecks(local, checklist)).toEqual(expected);
  });

  it('ignores spec units of items that have specs', () => {
    const withSpecs = makeTripChecklist({
      occasions: checklist.occasions,
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 10,
              specs: [makeChecklistSpec({ id: 101 })],
            }),
          ],
        }),
      ],
    });

    expect(pruneLocalChecks({ 1: { '10|': true } }, withSpecs)).toEqual({});
  });
});

describe('pruneLocalSpecChecks', () => {
  const withSpecs = makeTripChecklist({
    occasions: checklist.occasions,
    categories: [
      makeChecklistCategory({
        id: 1,
        items: [
          makeChecklistItem({
            id: 10,
            storage_location: '託運,隨身',
            specs: [
              makeChecklistSpec({ id: 101 }),
              makeChecklistSpec({ id: 102, storage_location: '隨身' }),
              makeChecklistSpec({ id: 103, storage_location: null }),
            ],
          }),
        ],
      }),
    ],
  });

  const tests: { name: string; local: LocalChecks; expected: LocalChecks }[] = [
    { name: 'returns an empty map for no edits', local: {}, expected: {} },
    {
      name: 'keeps edits whose occasion, spec and location all still exist',
      local: { 1: { '101|託運': true }, 2: { '102|隨身': false } },
      expected: { 1: { '101|託運': true }, 2: { '102|隨身': false } },
    },
    {
      name: 'keeps every inherited location of a spec without its own location',
      local: { 1: { '101|託運': true, '101|隨身': true } },
      expected: { 1: { '101|託運': true, '101|隨身': true } },
    },
    {
      name: 'drops edits at a location a spec with its own location does not have',
      local: { 1: { '102|隨身': true, '102|託運': true } },
      expected: { 1: { '102|隨身': true } },
    },
    {
      name: 'drops edits for removed specs but keeps the rest',
      local: { 1: { '101|託運': true, '999|託運': true } },
      expected: { 1: { '101|託運': true } },
    },
    {
      name: 'drops every edit for a removed occasion',
      local: { 1: { '101|託運': true }, 3: { '102|隨身': true } },
      expected: { 1: { '101|託運': true } },
    },
    {
      name: 'treats item ids as unknown spec ids',
      local: { 1: { '10|託運': true } },
      expected: {},
    },
  ];

  it.each(tests)('$name', ({ local, expected }) => {
    expect(pruneLocalSpecChecks(local, withSpecs)).toEqual(expected);
  });

  it('drops edits at a location removed from the item when specs inherit it', () => {
    const narrowed = makeTripChecklist({
      occasions: checklist.occasions,
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 10,
              storage_location: '託運',
              specs: [makeChecklistSpec({ id: 101 })],
            }),
          ],
        }),
      ],
    });

    expect(
      pruneLocalSpecChecks(
        { 1: { '101|託運': true, '101|隨身': true } },
        narrowed,
      ),
    ).toEqual({ 1: { '101|託運': true } });
  });
});

describe('changedChecks', () => {
  const tests: {
    name: string;
    local: Record<string, boolean> | undefined;
    saved: Record<string, boolean>;
    expected: [string, boolean][];
  }[] = [
    {
      name: 'no local edits',
      local: undefined,
      saved: { '1|託運': true },
      expected: [],
    },
    {
      name: 'edits matching the saved state',
      local: { '1|託運': true, '2|': false },
      saved: { '1|託運': true },
      expected: [],
    },
    {
      name: 'edits differing from the saved state',
      local: { '1|託運': false, '2|': true, '3|隨身': false },
      saved: { '1|託運': true },
      expected: [
        ['1|託運', false],
        ['2|', true],
      ],
    },
    {
      name: 'the same id at two locations compared independently',
      local: { '1|託運': false, '1|隨身': true },
      saved: { '1|託運': true, '1|隨身': true },
      expected: [['1|託運', false]],
    },
  ];

  it.each(tests)(
    'returns the right pairs for $name',
    ({ local, saved, expected }) => {
      expect(changedChecks(local, saved)).toEqual(expected);
    },
  );
});
