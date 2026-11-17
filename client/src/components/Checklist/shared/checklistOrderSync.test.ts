import { describe, expect, it } from 'vitest';

import { createSyncTracker } from './checklistDiffSync';
import { needsReorder, resolveSavedIds } from './checklistOrderSync';

describe('resolveSavedIds', () => {
  it('keeps saved ids and swaps temp ids for the created ids', () => {
    const tracker = createSyncTracker<{ id: number }>();
    tracker.added.set(-1, { id: 90 });
    tracker.added.set(-2, { id: 91 });

    expect(resolveSavedIds([5, -2, 7, -1], tracker)).toEqual([5, 91, 7, 90]);
  });

  it('throws when a temp id was never created', () => {
    const tracker = createSyncTracker<{ id: number }>();

    expect(() => resolveSavedIds([5, -3], tracker)).toThrow(
      'Checklist entry -3 was not saved before ordering',
    );
  });
});

describe('needsReorder', () => {
  it.each([
    {
      description: 'the order is unchanged',
      desired: [1, 2, 3],
      original: [1, 2, 3],
      expected: false,
    },
    {
      description: 'an entry was removed',
      desired: [1, 3],
      original: [1, 2, 3],
      expected: false,
    },
    {
      description: 'new entries are at the end, in creation order',
      desired: [1, 2, 8, 9],
      original: [1, 2],
      expected: false,
    },
    {
      description: 'a moved-in entry is already last in the stored order',
      desired: [1, 2, 3],
      original: [1, 2, 3],
      expected: false,
    },
    {
      description: 'two entries swapped places',
      desired: [2, 1, 3],
      original: [1, 2, 3],
      expected: true,
    },
    {
      description: 'a new entry sits before an existing one',
      desired: [8, 1, 2],
      original: [1, 2],
      expected: true,
    },
    {
      description: 'a removal leaves the remaining order changed',
      desired: [3, 1],
      original: [1, 2, 3],
      expected: true,
    },
    {
      description: 'a group is empty on both sides',
      desired: [],
      original: [],
      expected: false,
    },
  ])(
    'returns $expected when $description',
    ({ desired, original, expected }) => {
      expect(needsReorder(desired, original)).toBe(expected);
    },
  );
});
