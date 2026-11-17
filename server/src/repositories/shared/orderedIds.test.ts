import { describe, expect, it } from 'vitest';

import { isPermutationOf } from './orderedIds';

describe('isPermutationOf', () => {
  it.each([
    {
      name: 'same ids in a new order',
      ordered: [3, 1, 2],
      current: [1, 2, 3],
      expected: true,
    },
    { name: 'both empty', ordered: [], current: [], expected: true },
    {
      name: 'a missing id',
      ordered: [1, 2],
      current: [1, 2, 3],
      expected: false,
    },
    {
      name: 'an extra id',
      ordered: [1, 2, 3, 4],
      current: [1, 2, 3],
      expected: false,
    },
    {
      name: 'a duplicate id',
      ordered: [1, 1, 2],
      current: [1, 2, 3],
      expected: false,
    },
    {
      name: 'an unknown id',
      ordered: [1, 2, 9],
      current: [1, 2, 3],
      expected: false,
    },
    {
      name: 'a numeric string',
      ordered: [1, 2, '3'],
      current: [1, 2, 3],
      expected: false,
    },
    {
      name: 'a non-integer',
      ordered: [1, 2, 3.5],
      current: [1, 2, 3],
      expected: false,
    },
    { name: 'a non-positive id', ordered: [0], current: [0], expected: false },
  ])('returns $expected for $name', ({ ordered, current, expected }) => {
    expect(isPermutationOf(ordered, current)).toBe(expected);
  });
});
