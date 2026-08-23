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

// useEditState is a thin composer over useOccasionEditState and
// useCategoryEditState — their own behavior (add/update/remove CRUD,
// multi-entry isolation, etc.) is covered by useOccasionEditState.test.ts
// and useCategoryEditState.test.ts. These tests only verify the two hooks
// are wired together correctly into the combined shape that
// TripChecklistEditModal and useSaveChecklist expect.
describe('useEditState', () => {
  it('combines occasions and categories into a single edit object', () => {
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

  it('delegates occasion handlers to useOccasionEditState and reflects changes in edit.occasions', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addOccasionLocal());

    expect(result.current.visibleOccasions).toHaveLength(2);
    expect(result.current.edit.occasions).toHaveLength(2);
  });

  it('delegates category handlers to useCategoryEditState and reflects changes in edit.categories', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    act(() => result.current.addCategoryLocal());

    expect(result.current.visibleCategories).toHaveLength(2);
    expect(result.current.edit.categories).toHaveLength(2);
  });

  it('exposes the category hook state (expandedCats, scrollBodyRef) unchanged', () => {
    const { result } = renderHook(() => useEditState(makeChecklist()));

    expect(result.current.expandedCats).toEqual(new Set());
    expect(result.current.scrollBodyRef.current).toBeNull();
  });
});
