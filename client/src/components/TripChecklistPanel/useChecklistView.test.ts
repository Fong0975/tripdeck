import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import type { ChecklistCategory, ChecklistOccasion } from '@/types';

import { useChecklistView } from './useChecklistView';

const categories: ChecklistCategory[] = [
  makeChecklistCategory({
    id: 1,
    name: 'Clothes',
    items: [
      makeChecklistItem({ id: 10, name: 'Jacket', storage_location: '託運' }),
      makeChecklistItem({ id: 11, name: 'Socks' }),
    ],
  }),
];

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Out', checks: {}, specChecks: {} },
  { id: 2, name: 'Back', checks: {}, specChecks: {} },
];

type View = ReturnType<typeof useChecklistView>;

function renderView() {
  return renderHook(() => useChecklistView(categories, occasions));
}

describe('useChecklistView', () => {
  it('starts in the category view with nothing hidden', () => {
    const { result } = renderView();

    expect(result.current.viewMode).toBe('category');
    expect(result.current.hidden.size).toBe(0);
    expect(result.current.allHidden).toBe(false);
    expect(result.current.groups.map(group => group.label)).toEqual([
      'Clothes',
    ]);
  });

  it('has no groups while the checklist is loading', () => {
    const { result } = renderHook(() => useChecklistView(undefined, undefined));

    expect(result.current.groups).toEqual([]);
    expect(result.current.allHidden).toBe(false);
  });

  it('builds storage groups in the storage view', () => {
    const { result } = renderView();

    act(() => result.current.changeViewMode('storage'));

    expect(result.current.groups.map(group => group.label)).toEqual([
      '託運',
      '未指定存放位置',
    ]);
  });

  it.each([
    {
      name: 'hides one item',
      actions: [(view: View) => view.toggleItem('1', 10)],
      hidden: ['10|1'],
      allHidden: false,
    },
    {
      name: 'shows the item again when toggled twice',
      actions: [
        (view: View) => view.toggleItem('1', 10),
        (view: View) => view.toggleItem('1', 10),
      ],
      hidden: [],
      allHidden: false,
    },
    {
      name: 'reports allHidden once every item is hidden',
      actions: [
        (view: View) => view.toggleItem('1', 10),
        (view: View) => view.toggleItem('1', 11),
      ],
      hidden: ['10|1', '11|1'],
      allHidden: true,
    },
  ])('$name', ({ actions, hidden, allHidden }) => {
    const { result } = renderView();

    for (const action of actions) {
      act(() => action(result.current));
    }

    expect([...result.current.hidden].sort()).toEqual([...hidden].sort());
    expect(result.current.allHidden).toBe(allHidden);
  });

  it('toggles a whole group and clears the filter', () => {
    const { result } = renderView();

    act(() => result.current.toggleGroup(result.current.groups[0]));
    expect(result.current.allHidden).toBe(true);

    act(() => result.current.clearFilter());
    expect(result.current.hidden.size).toBe(0);
    expect(result.current.allHidden).toBe(false);
  });

  it('resets the filter when the view mode changes', () => {
    const { result } = renderView();
    act(() => result.current.toggleItem('1', 10));

    act(() => result.current.changeViewMode('storage'));

    expect(result.current.viewMode).toBe('storage');
    expect(result.current.hidden.size).toBe(0);
  });

  it('keeps applying the item filter while unfinished-only is on', () => {
    const { result } = renderView();
    act(() => result.current.toggleItem('1', 10));

    act(() => result.current.setIncompleteOnly(true));

    expect(result.current.incompleteOnly).toBe(true);
    expect(result.current.hidden.size).toBe(1);
    expect(result.current.filteredUnits).toHaveLength(1);
  });

  it('lists the units the item filter leaves', () => {
    const { result } = renderView();
    expect(result.current.filteredUnits).toHaveLength(2);

    act(() => result.current.toggleItem('1', 11));

    expect(result.current.filteredUnits.map(unit => unit.item.id)).toEqual([
      10,
    ]);
  });

  it('reports allHidden while unfinished-only is on too', () => {
    const { result } = renderView();
    act(() => result.current.toggleGroup(result.current.groups[0]));

    act(() => result.current.setIncompleteOnly(true));

    expect(result.current.allHidden).toBe(true);
  });

  it('turns unfinished-only off when the view mode changes', () => {
    const { result } = renderView();
    act(() => result.current.setIncompleteOnly(true));

    act(() => result.current.changeViewMode('storage'));

    expect(result.current.incompleteOnly).toBe(false);
  });

  it('shows every occasion by default and none while loading', () => {
    const { result } = renderView();
    const { result: loadingResult } = renderHook(() =>
      useChecklistView(undefined, undefined),
    );

    expect(result.current.visibleOccasions).toEqual(occasions);
    expect(result.current.occasions).toEqual(occasions);
    expect(loadingResult.current.visibleOccasions).toEqual([]);
  });

  it('hides an occasion but keeps the last shown one', () => {
    const { result } = renderView();

    act(() => result.current.toggleOccasion(2));
    expect(
      result.current.visibleOccasions.map(occasion => occasion.id),
    ).toEqual([1]);
    expect([...result.current.hiddenOccasionIds]).toEqual([2]);

    act(() => result.current.toggleOccasion(1));
    expect(
      result.current.visibleOccasions.map(occasion => occasion.id),
    ).toEqual([1]);

    act(() => result.current.toggleOccasion(2));
    expect(result.current.visibleOccasions).toHaveLength(2);
  });

  it('keeps the occasion selection when the view mode changes', () => {
    const { result } = renderView();
    act(() => result.current.toggleOccasion(2));

    act(() => result.current.changeViewMode('storage'));

    expect([...result.current.hiddenOccasionIds]).toEqual([2]);
  });
});
