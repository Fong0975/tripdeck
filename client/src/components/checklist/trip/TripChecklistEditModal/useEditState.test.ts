import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TripChecklist } from '@/types';

import { useEditState } from './useEditState';

function makeChecklist(overrides: Partial<TripChecklist> = {}): TripChecklist {
  return {
    tripId: 1,
    occasions: [{ id: 1, name: 'Occasion A', checks: {} }],
    categories: [
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
    ],
    ...overrides,
  };
}

describe('useEditState', () => {
  it('converts the checklist into edit state, dropping the occasion checks map', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    expect(result.current.edit).toEqual({
      occasions: [{ id: 1, name: 'Occasion A' }],
      categories: [
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
      ],
    });
  });

  it('adds a locally-created occasion with a negative temp id', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addOccasionLocal());

    expect(result.current.visibleOccasions).toHaveLength(2);
    expect(result.current.visibleOccasions[1].id).toBeLessThan(0);
    expect(result.current.visibleOccasions[1].name).toBe('新時機');
  });

  it('updates an occasion name in place', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.updateOccasionName(1, 'Renamed'));

    expect(result.current.visibleOccasions[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added occasion (negative id)',
      setup: (r: ReturnType<typeof useEditState>) => r.addOccasionLocal(),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added occasion instead.
      getId: (result: { current: ReturnType<typeof useEditState> }) => {
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
      const { result } = renderHook(() => useEditState(makeChecklist()));
      act(() => setup(result.current));
      const id = getId(result);

      act(() => result.current.removeOccasion(id));

      expect(result.current.visibleOccasions).toHaveLength(
        expectRemoved ? 1 : 0,
      );
    },
  );

  it('adds a locally-created category with a negative temp id', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addCategoryLocal());

    expect(result.current.visibleCategories).toHaveLength(2);
    expect(result.current.visibleCategories[1].id).toBeLessThan(0);
    expect(result.current.visibleCategories[1].name).toBe('新分類');
    expect(result.current.visibleCategories[1].items).toEqual([]);
  });

  it('updates a category name in place', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.updateCategoryName(1, 'Renamed'));

    expect(result.current.visibleCategories[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added category (negative id)',
      setup: (r: ReturnType<typeof useEditState>) => r.addCategoryLocal(),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added category instead.
      getId: (result: { current: ReturnType<typeof useEditState> }) => {
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
      const { result } = renderHook(() => useEditState(makeChecklist()));
      act(() => setup(result.current));
      const id = getId(result);

      act(() => result.current.removeCategory(id));

      expect(result.current.visibleCategories).toHaveLength(
        expectRemoved ? 1 : 0,
      );
    },
  );

  it('toggles a category id in and out of expandedCats', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.toggleCatExpanded(1));
    expect(result.current.expandedCats.has(1)).toBe(true);

    act(() => result.current.toggleCatExpanded(1));
    expect(result.current.expandedCats.has(1)).toBe(false);
  });

  it('adds a locally-created item to the target category', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addItemLocal(1));

    const items = result.current.visibleCategories[0].items;
    expect(items).toHaveLength(2);
    expect(items[1].id).toBeLessThan(0);
    expect(items[1].name).toBe('新項目');
  });

  it('updates an item field within its category', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.updateItem(1, 10, { name: 'Renamed' }));

    expect(result.current.visibleCategories[0].items[0].name).toBe('Renamed');
  });

  it.each([
    {
      description: 'a locally-added item (negative id)',
      setup: (r: ReturnType<typeof useEditState>) => r.addItemLocal(1),
      // `nextTempId()` is a module-level counter shared across every test
      // in this file, so the generated id can't be hardcoded — it's read
      // back from the freshly-added item instead.
      getId: (result: { current: ReturnType<typeof useEditState> }) => {
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
      const { result } = renderHook(() => useEditState(makeChecklist()));
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
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addSpecLocal(1, 10));

    const specs = result.current.visibleCategories[0].items[0].specs;
    expect(specs).toHaveLength(2);
    expect(specs[1].id).toBeLessThan(0);
    expect(specs[1].name).toBe('新規格');
  });

  it('updates a spec field within its item', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() =>
      result.current.updateSpec(1, 10, 100, { storage_location: '隨身' }),
    );

    expect(
      result.current.visibleCategories[0].items[0].specs[0].storage_location,
    ).toBe('隨身');
  });

  it('removes a spec from its item entirely (specs have no soft-delete)', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.removeSpec(1, 10, 100));

    expect(result.current.visibleCategories[0].items[0].specs).toEqual([]);
  });

  describe('unmatched entries stay untouched among multiple entries', () => {
    function makeMultiChecklist(): TripChecklist {
      return {
        tripId: 1,
        occasions: [
          { id: 1, name: 'Occasion A', checks: {} },
          { id: 2, name: 'Occasion B', checks: {} },
        ],
        categories: [
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
        ],
      };
    }

    it('updateOccasionName only changes the matching occasion', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.updateOccasionName(1, 'Renamed'));

      expect(result.current.visibleOccasions).toEqual([
        { id: 1, name: 'Renamed' },
        { id: 2, name: 'Occasion B' },
      ]);
    });

    it('removeOccasion only flags the matching occasion', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.removeOccasion(1));

      expect(result.current.visibleOccasions).toEqual([
        { id: 2, name: 'Occasion B' },
      ]);
      expect(result.current.edit.occasions).toEqual([
        { id: 1, name: 'Occasion A', _deleted: true },
        { id: 2, name: 'Occasion B' },
      ]);
    });

    it('updateCategoryName only changes the matching category', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.updateCategoryName(1, 'Renamed'));

      expect(result.current.visibleCategories[0].name).toBe('Renamed');
      expect(result.current.visibleCategories[1].name).toBe('Category B');
    });

    it('removeCategory only flags the matching category', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.removeCategory(1));

      expect(result.current.visibleCategories).toHaveLength(1);
      expect(result.current.visibleCategories[0].name).toBe('Category B');
    });

    it('updateItem only changes the matching item, leaving sibling items and other categories untouched', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.updateItem(1, 10, { name: 'Renamed' }));

      const [catA, catB] = result.current.visibleCategories;
      expect(catA.items[0].name).toBe('Renamed');
      expect(catA.items[1].name).toBe('Item B');
      expect(catB.items[0].name).toBe('Item C');
    });

    it('removeItem only flags the matching item, leaving sibling items and other categories untouched', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.removeItem(1, 10));

      const [catA, catB] = result.current.visibleCategories;
      expect(catA.items[0]._deleted).toBe(true);
      expect(catA.items[1]._deleted).toBeUndefined();
      expect(catB.items[0]._deleted).toBeUndefined();
    });

    it('updateSpec only changes the matching spec, leaving sibling specs untouched', () => {
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

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
      const { result } = renderHook(() => useEditState(makeMultiChecklist()));

      act(() => result.current.removeSpec(1, 10, 100));

      const specs = result.current.visibleCategories[0].items[0].specs;
      expect(specs).toEqual([
        { id: 101, name: 'Spec B', storage_location: null },
      ]);
    });
  });
});
