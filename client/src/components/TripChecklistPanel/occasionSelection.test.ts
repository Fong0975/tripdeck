import { describe, expect, it } from 'vitest';

import type { ChecklistOccasion } from '@/types';

import {
  getVisibleOccasions,
  NO_HIDDEN_OCCASIONS,
  toggleOccasion,
} from './occasionSelection';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'A', checks: {}, specChecks: {} },
  { id: 2, name: 'B', checks: {}, specChecks: {} },
  { id: 3, name: 'C', checks: {}, specChecks: {} },
];

describe('getVisibleOccasions', () => {
  it.each([
    {
      name: 'shows everything by default',
      hidden: [] as number[],
      expected: [1, 2, 3],
    },
    { name: 'drops hidden occasions', hidden: [2], expected: [1, 3] },
    {
      name: 'ignores ids that are not occasions',
      hidden: [9],
      expected: [1, 2, 3],
    },
    {
      name: 'falls back to every occasion when all would be hidden',
      hidden: [1, 2, 3],
      expected: [1, 2, 3],
    },
  ])('$name', ({ hidden, expected }) => {
    const result = getVisibleOccasions(occasions, new Set(hidden));

    expect(result.map(occasion => occasion.id)).toEqual(expected);
  });

  it('shows nothing when there are no occasions', () => {
    expect(getVisibleOccasions([], NO_HIDDEN_OCCASIONS)).toEqual([]);
  });
});

describe('toggleOccasion', () => {
  it.each([
    {
      name: 'hides a shown occasion',
      hidden: [] as number[],
      id: 2,
      expected: [2],
    },
    { name: 'shows a hidden occasion again', hidden: [2], id: 2, expected: [] },
    { name: 'hides a second occasion', hidden: [1], id: 2, expected: [1, 2] },
    {
      name: 'refuses to hide the last shown occasion',
      hidden: [1, 2],
      id: 3,
      expected: [1, 2],
    },
  ])('$name', ({ hidden, id, expected }) => {
    const input = new Set(hidden);

    const next = toggleOccasion(occasions, input, id);

    expect([...next].sort()).toEqual(expected);
    expect(input.size).toBe(hidden.length);
  });
});
