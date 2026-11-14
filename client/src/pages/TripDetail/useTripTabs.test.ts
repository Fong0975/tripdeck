import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTripTabs, type TripTab } from './useTripTabs';

describe('useTripTabs', () => {
  it('starts on the itinerary tab with no pending confirmation', () => {
    const { result } = renderHook(() => useTripTabs(false));

    expect(result.current.activeTab).toBe('itinerary');
    expect(result.current.showDiscardConfirm).toBe(false);
  });

  const tests: {
    name: string;
    dirty: boolean;
    start: TripTab;
    target: TripTab;
    resolve?: 'confirm' | 'cancel';
    expectedConfirm: boolean;
    expectedTab: TripTab;
  }[] = [
    {
      name: 'switches immediately from itinerary even when dirty',
      dirty: true,
      start: 'itinerary',
      target: 'checklist',
      expectedConfirm: false,
      expectedTab: 'checklist',
    },
    {
      name: 'switches immediately away from a clean checklist',
      dirty: false,
      start: 'checklist',
      target: 'itinerary',
      expectedConfirm: false,
      expectedTab: 'itinerary',
    },
    {
      name: 'holds a switch away from a dirty checklist pending confirmation',
      dirty: true,
      start: 'checklist',
      target: 'itinerary',
      expectedConfirm: true,
      expectedTab: 'checklist',
    },
    {
      name: 'applies the held switch on confirm',
      dirty: true,
      start: 'checklist',
      target: 'itinerary',
      resolve: 'confirm',
      expectedConfirm: false,
      expectedTab: 'itinerary',
    },
    {
      name: 'stays on the checklist on cancel',
      dirty: true,
      start: 'checklist',
      target: 'itinerary',
      resolve: 'cancel',
      expectedConfirm: false,
      expectedTab: 'checklist',
    },
    {
      name: 'ignores a request for the already active dirty tab',
      dirty: true,
      start: 'checklist',
      target: 'checklist',
      expectedConfirm: false,
      expectedTab: 'checklist',
    },
  ];

  it.each(tests)(
    '$name',
    ({ dirty, start, target, resolve, expectedConfirm, expectedTab }) => {
      const { result, rerender } = renderHook(
        ({ isDirty }) => useTripTabs(isDirty),
        { initialProps: { isDirty: false } },
      );
      act(() => result.current.requestTab(start));
      rerender({ isDirty: dirty });

      act(() => result.current.requestTab(target));
      if (resolve === 'confirm') {
        act(() => result.current.confirmTabSwitch());
      } else if (resolve === 'cancel') {
        act(() => result.current.cancelTabSwitch());
      }

      expect(result.current.showDiscardConfirm).toBe(expectedConfirm);
      expect(result.current.activeTab).toBe(expectedTab);
    },
  );
});
