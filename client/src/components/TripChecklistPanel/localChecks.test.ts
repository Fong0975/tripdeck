import { describe, expect, it } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeTripChecklist,
} from '@/test-utils/fixtures';

import { pruneLocalChecks, type LocalChecks } from './localChecks';

const checklist = makeTripChecklist({
  occasions: [
    { id: 1, name: 'Occ A', checks: {} },
    { id: 2, name: 'Occ B', checks: {} },
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
