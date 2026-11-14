import type { UniqueIdentifier } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';

import {
  crossDayInsertIndex,
  resolveDropTarget,
  type DropTarget,
} from './dragTarget';

/** Day 0 holds 100, 101; day 1 holds 200; day 2 is empty. */
const days = [
  { attractions: [{ id: 100 }, { id: 101 }] },
  { attractions: [{ id: 200 }] },
  { attractions: [] },
];

describe('resolveDropTarget', () => {
  const tests: Array<{
    name: string;
    activeId: UniqueIdentifier;
    overId: UniqueIdentifier;
    expected: DropTarget | null;
  }> = [
    {
      name: 'over an attraction in the same day',
      activeId: 100,
      overId: 101,
      expected: {
        sourceDayIndex: 0,
        sourceIndex: 0,
        targetDayIndex: 0,
        overIndex: 1,
      },
    },
    {
      name: 'over an attraction in another day',
      activeId: 101,
      overId: 200,
      expected: {
        sourceDayIndex: 0,
        sourceIndex: 1,
        targetDayIndex: 1,
        overIndex: 0,
      },
    },
    {
      name: 'on a day column',
      activeId: 200,
      overId: 'day-2',
      expected: {
        sourceDayIndex: 1,
        sourceIndex: 0,
        targetDayIndex: 2,
        overIndex: null,
      },
    },
    {
      name: 'on a day column index past the last day',
      activeId: 100,
      overId: 'day-3',
      expected: null,
    },
    {
      name: 'with an unknown active attraction',
      activeId: 999,
      overId: 101,
      expected: null,
    },
    {
      name: 'over an unknown attraction',
      activeId: 100,
      overId: 999,
      expected: null,
    },
    {
      name: 'over a string id that is not a day column',
      activeId: 100,
      overId: 'day-x',
      expected: null,
    },
  ];

  it.each(tests)('resolves a drop $name', ({ activeId, overId, expected }) => {
    expect(resolveDropTarget(days, activeId, overId)).toEqual(expected);
  });
});

describe('crossDayInsertIndex', () => {
  const base: DropTarget = {
    sourceDayIndex: 0,
    sourceIndex: 0,
    targetDayIndex: 1,
    overIndex: null,
  };

  it.each([
    {
      name: 'uses the index of the attraction dropped over',
      target: { ...base, overIndex: 2 },
      expected: 2,
    },
    {
      name: 'uses the index 0 of the first attraction',
      target: { ...base, overIndex: 0 },
      expected: 0,
    },
    {
      name: 'appends when dropped on the day column',
      target: base,
      expected: 5,
    },
  ])('$name', ({ target, expected }) => {
    expect(crossDayInsertIndex(target, 5)).toBe(expected);
  });
});
