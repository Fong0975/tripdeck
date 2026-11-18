import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';

import type { CheckUnit } from './checkUnits';
import { FINISHED_LINGER_MS, useIncompleteOnly } from './useIncompleteOnly';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Out', checks: {}, specChecks: {} },
  { id: 2, name: 'Back', checks: {}, specChecks: {} },
];

const unit: CheckUnit = {
  kind: 'item',
  item: makeChecklistItem({ id: 10 }),
  location: '',
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Renders the hook over a mutable set of checked `occId:itemId` cells. */
function renderIncompleteOnly(checked: Set<string>, enabled = true) {
  const onToggleCheck = vi.fn();
  const onToggleSpecCheck = vi.fn();
  const view = renderHook(
    ({ on }: { on: boolean }) =>
      useIncompleteOnly({
        enabled: on,
        occasions,
        getCheck: (occId, id) => checked.has(`${occId}:${id}`),
        getSpecCheck: () => false,
        onToggleCheck,
        onToggleSpecCheck,
      }),
    { initialProps: { on: enabled } },
  );
  return { view, onToggleCheck, onToggleSpecCheck };
}

describe('useIncompleteOnly', () => {
  it('offers no visibility rule while disabled', () => {
    const { view } = renderIncompleteOnly(new Set(), false);

    expect(view.result.current.isUnitVisible).toBeUndefined();
  });

  it.each([
    { name: 'nothing is checked', checked: [], expected: true },
    { name: 'one occasion is checked', checked: ['1:10'], expected: true },
    {
      name: 'every occasion is checked',
      checked: ['1:10', '2:10'],
      expected: false,
    },
  ])('shows the unit when $name: $expected', ({ checked, expected }) => {
    const { view } = renderIncompleteOnly(new Set(checked));

    expect(view.result.current.isUnitVisible?.(unit)).toBe(expected);
  });

  it('passes the toggle through to the handler', () => {
    const { view, onToggleCheck, onToggleSpecCheck } = renderIncompleteOnly(
      new Set(),
    );

    act(() => view.result.current.toggleCheck(1, 10, ''));
    act(() => view.result.current.toggleSpecCheck(2, 5, '託運'));

    expect(onToggleCheck).toHaveBeenCalledWith(1, 10, '');
    expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 5, '託運');
  });

  it('keeps a unit finished by a check visible for three seconds', () => {
    const checked = new Set(['2:10']);
    const { view, onToggleCheck } = renderIncompleteOnly(checked);

    act(() => view.result.current.toggleCheck(1, 10, ''));
    checked.add('1:10');
    onToggleCheck.mockClear();
    view.rerender({ on: true });
    expect(view.result.current.isUnitVisible?.(unit)).toBe(true);

    act(() => vi.advanceTimersByTime(FINISHED_LINGER_MS - 1));
    expect(view.result.current.isUnitVisible?.(unit)).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(view.result.current.isUnitVisible?.(unit)).toBe(false);
  });

  it('does not hide a unit that is toggled back within the three seconds', () => {
    const checked = new Set(['2:10']);
    const { view } = renderIncompleteOnly(checked);
    act(() => view.result.current.toggleCheck(1, 10, ''));
    checked.add('1:10');
    view.rerender({ on: true });

    act(() => view.result.current.toggleCheck(1, 10, ''));
    checked.delete('1:10');
    view.rerender({ on: true });
    act(() => vi.advanceTimersByTime(FINISHED_LINGER_MS * 2));

    expect(view.result.current.isUnitVisible?.(unit)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not keep a unit that is still unfinished in another occasion', () => {
    const { view } = renderIncompleteOnly(new Set());

    act(() => view.result.current.toggleCheck(1, 10, ''));

    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start timers while disabled', () => {
    const checked = new Set(['2:10']);
    const { view } = renderIncompleteOnly(checked, false);

    act(() => view.result.current.toggleCheck(1, 10, ''));

    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    {
      name: 'while disabled',
      enabled: false,
      checked: ['1:10', '2:10'],
      expected: false,
    },
    {
      name: 'when a unit is unfinished',
      enabled: true,
      checked: ['1:10'],
      expected: false,
    },
    {
      name: 'when every unit is finished',
      enabled: true,
      checked: ['1:10', '2:10'],
      expected: true,
    },
  ])(
    'reports allFinished=$expected $name',
    ({ enabled, checked, expected }) => {
      const set = new Set(checked);
      const view = renderHook(() =>
        useIncompleteOnly({
          enabled,
          occasions,
          categories: [
            makeChecklistCategory({ items: [makeChecklistItem({ id: 10 })] }),
          ],
          getCheck: (occId, id) => set.has(`${occId}:${id}`),
          getSpecCheck: () => false,
          onToggleCheck: vi.fn(),
          onToggleSpecCheck: vi.fn(),
        }),
      );

      expect(view.result.current.allFinished).toBe(expected);
    },
  );

  it('does not report allFinished for a checklist without units', () => {
    const view = renderHook(() =>
      useIncompleteOnly({
        enabled: true,
        occasions,
        categories: [],
        getCheck: () => true,
        getSpecCheck: () => true,
        onToggleCheck: vi.fn(),
        onToggleSpecCheck: vi.fn(),
      }),
    );

    expect(view.result.current.allFinished).toBe(false);
  });
});
