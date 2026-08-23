import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChecklistOccasion } from '@/types';

import { useOccasionEditState } from './useOccasionEditState';

function makeOccasions(): ChecklistOccasion[] {
  return [{ id: 1, name: 'Occasion A', checks: {} }];
}

function makeMultiOccasions(): ChecklistOccasion[] {
  return [
    { id: 1, name: 'Occasion A', checks: {} },
    { id: 2, name: 'Occasion B', checks: {} },
  ];
}

describe('useOccasionEditState', () => {
  it('converts occasions into edit state, dropping the checks map', () => {
    const { result } = renderHook(() => useOccasionEditState(makeOccasions()));

    expect(result.current.occasions).toEqual([{ id: 1, name: 'Occasion A' }]);
  });

  it('adds a locally-created occasion with a negative temp id', () => {
    const { result } = renderHook(() => useOccasionEditState(makeOccasions()));

    act(() => result.current.addOccasionLocal());

    expect(result.current.visibleOccasions).toHaveLength(2);
    expect(result.current.visibleOccasions[1].id).toBeLessThan(0);
    expect(result.current.visibleOccasions[1].name).toBe('新時機');
  });

  it('updates an occasion name in place', () => {
    const { result } = renderHook(() => useOccasionEditState(makeOccasions()));

    act(() => result.current.updateOccasionName(1, 'Renamed'));

    expect(result.current.visibleOccasions[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added occasion (negative id)',
      setup: (r: ReturnType<typeof useOccasionEditState>) =>
        r.addOccasionLocal(),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added occasion instead.
      getId: (result: { current: ReturnType<typeof useOccasionEditState> }) => {
        const occasions = result.current.visibleOccasions;
        return occasions[occasions.length - 1].id;
      },
      expectRemoved: true,
    },
    {
      description: 'a persisted occasion (positive id)',
      setup: () => {},
      getId: () => 1,
      expectRemoved: false,
    },
  ])(
    'removing $description removes-entirely=$expectRemoved',
    ({ setup, getId, expectRemoved }) => {
      const { result } = renderHook(() =>
        useOccasionEditState(makeOccasions()),
      );
      act(() => setup(result.current));
      const id = getId(result);

      act(() => result.current.removeOccasion(id));

      expect(result.current.visibleOccasions).toHaveLength(
        expectRemoved ? 1 : 0,
      );
    },
  );

  it('updateOccasionName only changes the matching occasion', () => {
    const { result } = renderHook(() =>
      useOccasionEditState(makeMultiOccasions()),
    );

    act(() => result.current.updateOccasionName(1, 'Renamed'));

    expect(result.current.visibleOccasions).toEqual([
      { id: 1, name: 'Renamed' },
      { id: 2, name: 'Occasion B' },
    ]);
  });

  it('removeOccasion only flags the matching occasion', () => {
    const { result } = renderHook(() =>
      useOccasionEditState(makeMultiOccasions()),
    );

    act(() => result.current.removeOccasion(1));

    expect(result.current.visibleOccasions).toEqual([
      { id: 2, name: 'Occasion B' },
    ]);
    expect(result.current.occasions).toEqual([
      { id: 1, name: 'Occasion A', _deleted: true },
      { id: 2, name: 'Occasion B' },
    ]);
  });
});
