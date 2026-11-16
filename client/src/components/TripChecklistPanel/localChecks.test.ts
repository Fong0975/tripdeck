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
      items: [makeChecklistItem({ id: 10 }), makeChecklistItem({ id: 20 })],
    }),
    makeChecklistCategory({ id: 2, items: [makeChecklistItem({ id: 30 })] }),
  ],
});

describe('pruneLocalChecks', () => {
  const tests: { name: string; local: LocalChecks; expected: LocalChecks }[] = [
    { name: 'returns an empty map for no edits', local: {}, expected: {} },
    {
      name: 'keeps edits whose occasion and item both still exist',
      local: { 1: { 10: true, 30: false }, 2: { 20: true } },
      expected: { 1: { 10: true, 30: false }, 2: { 20: true } },
    },
    {
      name: 'drops edits for removed items but keeps the rest',
      local: { 1: { 10: true, 99: true } },
      expected: { 1: { 10: true } },
    },
    {
      name: 'drops every edit for a removed occasion',
      local: { 1: { 10: true }, 3: { 20: true } },
      expected: { 1: { 10: true } },
    },
    {
      name: 'omits an occasion left with no edits',
      local: { 2: { 99: false } },
      expected: {},
    },
  ];

  it.each(tests)('$name', ({ local, expected }) => {
    expect(pruneLocalChecks(local, checklist)).toEqual(expected);
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
            specs: [
              makeChecklistSpec({ id: 101 }),
              makeChecklistSpec({ id: 102 }),
            ],
          }),
        ],
      }),
    ],
  });

  const tests: { name: string; local: LocalChecks; expected: LocalChecks }[] = [
    { name: 'returns an empty map for no edits', local: {}, expected: {} },
    {
      name: 'keeps edits whose occasion and spec both still exist',
      local: { 1: { 101: true }, 2: { 102: false } },
      expected: { 1: { 101: true }, 2: { 102: false } },
    },
    {
      name: 'drops edits for removed specs but keeps the rest',
      local: { 1: { 101: true, 999: true } },
      expected: { 1: { 101: true } },
    },
    {
      name: 'drops every edit for a removed occasion',
      local: { 1: { 101: true }, 3: { 102: true } },
      expected: { 1: { 101: true } },
    },
    {
      name: 'treats item ids as unknown spec ids',
      local: { 1: { 10: true } },
      expected: {},
    },
  ];

  it.each(tests)('$name', ({ local, expected }) => {
    expect(pruneLocalSpecChecks(local, withSpecs)).toEqual(expected);
  });
});

describe('changedChecks', () => {
  const tests: {
    name: string;
    local: Record<number, boolean> | undefined;
    saved: Record<number, boolean>;
    expected: [number, boolean][];
  }[] = [
    {
      name: 'no local edits',
      local: undefined,
      saved: { 1: true },
      expected: [],
    },
    {
      name: 'edits matching the saved state',
      local: { 1: true, 2: false },
      saved: { 1: true },
      expected: [],
    },
    {
      name: 'edits differing from the saved state',
      local: { 1: false, 2: true, 3: false },
      saved: { 1: true },
      expected: [
        [1, false],
        [2, true],
      ],
    },
  ];

  it.each(tests)(
    'returns the right pairs for $name',
    ({ local, saved, expected }) => {
      expect(changedChecks(local, saved)).toEqual(expected);
    },
  );
});
