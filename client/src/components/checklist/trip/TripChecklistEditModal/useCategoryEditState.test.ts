import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChecklistCategory } from '@/types';

import { useCategoryEditState } from './useCategoryEditState';

function makeCategories(): ChecklistCategory[] {
  return [
    {
      id: 1,
      name: 'Category A',
      items: [
        {
          id: 10,
          name: 'Item A',
          quantity: 2,
          notes: 'note',
          storage_location: '託運',
          specs: [{ id: 100, name: 'Spec A', storage_location: null }],
        },
      ],
    },
  ];
}

function makeMultiCategories(): ChecklistCategory[] {
  return [
    {
      id: 1,
      name: 'Category A',
      items: [
        {
          id: 10,
          name: 'Item A',
          quantity: 2,
          notes: 'note',
          storage_location: '託運',
          specs: [
            { id: 100, name: 'Spec A', storage_location: null },
            { id: 101, name: 'Spec B', storage_location: null },
          ],
        },
        {
          id: 11,
          name: 'Item B',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [],
        },
      ],
    },
    {
      id: 2,
      name: 'Category B',
      items: [
        {
          id: 20,
          name: 'Item C',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [],
        },
      ],
    },
  ];
}

describe('useCategoryEditState', () => {
  it('converts categories into edit state', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    expect(result.current.categories).toEqual([
      {
        id: 1,
        name: 'Category A',
        items: [
          {
            id: 10,
            name: 'Item A',
            quantity: 2,
            notes: 'note',
            storage_location: '託運',
            specs: [{ id: 100, name: 'Spec A', storage_location: null }],
          },
        ],
      },
    ]);
  });

  it('adds a locally-created category with a negative temp id', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.addCategoryLocal());

    expect(result.current.visibleCategories).toHaveLength(2);
    expect(result.current.visibleCategories[1].id).toBeLessThan(0);
    expect(result.current.visibleCategories[1].name).toBe('新分類');
    expect(result.current.visibleCategories[1].items).toEqual([]);
  });

  it('updates a category name in place', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.updateCategoryName(1, 'Renamed'));

    expect(result.current.visibleCategories[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added category (negative id)',
      setup: (r: ReturnType<typeof useCategoryEditState>) =>
        r.addCategoryLocal(),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added category instead.
      getId: (result: { current: ReturnType<typeof useCategoryEditState> }) => {
        const categories = result.current.visibleCategories;
        return categories[categories.length - 1].id;
      },
      expectRemoved: true,
    },
    {
      description: 'a persisted category (positive id)',
      setup: () => {},
      getId: () => 1,
      expectRemoved: false,
    },
  ])(
    'removing $description removes-entirely=$expectRemoved',
    ({ setup, getId, expectRemoved }) => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeCategories()),
      );
      act(() => setup(result.current));
      const id = getId(result);

      act(() => result.current.removeCategory(id));

      expect(result.current.visibleCategories).toHaveLength(
        expectRemoved ? 1 : 0,
      );
    },
  );

  it('toggles a category id in and out of expandedCats', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.toggleCatExpanded(1));
    expect(result.current.expandedCats.has(1)).toBe(true);

    act(() => result.current.toggleCatExpanded(1));
    expect(result.current.expandedCats.has(1)).toBe(false);
  });

  it('adds a locally-created item to the target category', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.addItemLocal(1));

    const items = result.current.visibleCategories[0].items;
    expect(items).toHaveLength(2);
    expect(items[1].id).toBeLessThan(0);
    expect(items[1].name).toBe('新項目');
  });

  it('updates an item field within its category', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.updateItem(1, 10, { name: 'Renamed' }));

    expect(result.current.visibleCategories[0].items[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added item (negative id)',
      setup: (r: ReturnType<typeof useCategoryEditState>) => r.addItemLocal(1),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added item instead.
      getId: (result: { current: ReturnType<typeof useCategoryEditState> }) => {
        const items = result.current.visibleCategories[0].items;
        return items[items.length - 1].id;
      },
      expectRemoved: true,
    },
    {
      description: 'a persisted item (positive id)',
      setup: () => {},
      getId: () => 10,
      expectRemoved: false,
    },
  ])(
    'removing $description removes-entirely=$expectRemoved',
    ({ setup, getId, expectRemoved }) => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeCategories()),
      );
      act(() => setup(result.current));
      const id = getId(result);

      act(() => result.current.removeItem(1, id));

      // Unlike occasions/categories, the hook does not derive a filtered
      // "visible items" list — item-level `_deleted` filtering is left to
      // the consuming component. A negative-id item is spliced out of the
      // array entirely; a positive-id item stays in the array, flagged.
      const items = result.current.visibleCategories[0].items;
      if (expectRemoved) {
        expect(items.find(i => i.id === id)).toBeUndefined();
      } else {
        expect(items.find(i => i.id === id)?._deleted).toBe(true);
      }
    },
  );

  it('adds a locally-created spec to the target item', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.addSpecLocal(1, 10));

    const specs = result.current.visibleCategories[0].items[0].specs;
    expect(specs).toHaveLength(2);
    expect(specs[1].id).toBeLessThan(0);
    expect(specs[1].name).toBe('新規格');
  });

  it('updates a spec field within its item', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() =>
      result.current.updateSpec(1, 10, 100, { storage_location: '隨身' }),
    );

    expect(
      result.current.visibleCategories[0].items[0].specs[0].storage_location,
    ).toBe('隨身');
  });

  it('removes a spec from its item entirely (specs have no soft-delete)', () => {
    const { result } = renderHook(() => useCategoryEditState(makeCategories()));

    act(() => result.current.removeSpec(1, 10, 100));

    expect(result.current.visibleCategories[0].items[0].specs).toEqual([]);
  });

  describe('unmatched entries stay untouched among multiple entries', () => {
    it('updateCategoryName only changes the matching category', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() => result.current.updateCategoryName(1, 'Renamed'));

      expect(result.current.visibleCategories[0].name).toBe('Renamed');
      expect(result.current.visibleCategories[1].name).toBe('Category B');
    });

    it('removeCategory only flags the matching category', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() => result.current.removeCategory(1));

      expect(result.current.visibleCategories).toHaveLength(1);
      expect(result.current.visibleCategories[0].name).toBe('Category B');
    });

    it('updateItem only changes the matching item, leaving sibling items and other categories untouched', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() => result.current.updateItem(1, 10, { name: 'Renamed' }));

      const [catA, catB] = result.current.visibleCategories;
      expect(catA.items[0].name).toBe('Renamed');
      expect(catA.items[1].name).toBe('Item B');
      expect(catB.items[0].name).toBe('Item C');
    });

    it('removeItem only flags the matching item, leaving sibling items and other categories untouched', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() => result.current.removeItem(1, 10));

      const [catA, catB] = result.current.visibleCategories;
      expect(catA.items[0]._deleted).toBe(true);
      expect(catA.items[1]._deleted).toBeUndefined();
      expect(catB.items[0]._deleted).toBeUndefined();
    });

    it('updateSpec only changes the matching spec, leaving sibling specs untouched', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() =>
        result.current.updateSpec(1, 10, 100, { storage_location: '隨身' }),
      );

      const specs = result.current.visibleCategories[0].items[0].specs;
      expect(specs[0]).toEqual({
        id: 100,
        name: 'Spec A',
        storage_location: '隨身',
      });
      expect(specs[1]).toEqual({
        id: 101,
        name: 'Spec B',
        storage_location: null,
      });
    });

    it('removeSpec only removes the matching spec, leaving sibling specs untouched', () => {
      const { result } = renderHook(() =>
        useCategoryEditState(makeMultiCategories()),
      );

      act(() => result.current.removeSpec(1, 10, 100));

      const specs = result.current.visibleCategories[0].items[0].specs;
      expect(specs).toEqual([
        { id: 101, name: 'Spec B', storage_location: null },
      ]);
    });
  });
});
