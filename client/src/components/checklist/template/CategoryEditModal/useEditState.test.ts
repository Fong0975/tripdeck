import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChecklistCategory } from '@/types';

import { useEditState } from './useEditState';

function makeCategory(
  overrides: Partial<ChecklistCategory> = {},
): ChecklistCategory {
  return {
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
    ...overrides,
  };
}

describe('useEditState', () => {
  it('converts the category into edit state', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    expect(result.current.edit).toEqual({
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
    });
  });

  it('updates the category name', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.updateCategoryName('Renamed'));

    expect(result.current.edit.name).toBe('Renamed');
  });

  it('adds a locally-created item with a negative temp id', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.addItem());

    expect(result.current.visibleItems).toHaveLength(2);
    expect(result.current.visibleItems[1].id).toBeLessThan(0);
    expect(result.current.visibleItems[1].name).toBe('新項目');
  });

  it('updates an item field in place', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.updateItem(10, { name: 'Changed' }));

    expect(result.current.visibleItems[0].name).toBe('Changed');
  });

  it('removes a newly added item entirely once it is deleted', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));
    act(() => result.current.addItem());
    const newItemId = result.current.visibleItems[1].id;

    act(() => result.current.handleDeleteItem(newItemId));

    expect(result.current.visibleItems).toHaveLength(1);
    expect(result.current.edit.items).toHaveLength(1);
  });

  it('hides an existing item once it is marked deleted, without removing it from edit.items', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.handleDeleteItem(10));

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.edit.items).toHaveLength(1);
    expect(result.current.edit.items[0]._deleted).toBe(true);
  });

  it('adds a locally-created spec with a negative temp id', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.addSpec(10));

    const specs = result.current.visibleItems[0].specs;
    expect(specs).toHaveLength(2);
    expect(specs[1].id).toBeLessThan(0);
    expect(specs[1].name).toBe('新規格');
  });

  it('updates a spec field in place', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.updateSpec(10, 100, { storage_location: '隨身' }));

    expect(result.current.visibleItems[0].specs[0].storage_location).toBe(
      '隨身',
    );
  });

  it('removes a spec from its item entirely (specs have no soft-delete)', () => {
    const { result } = renderHook(() => useEditState(makeCategory()));

    act(() => result.current.deleteSpec(10, 100));

    expect(result.current.visibleItems[0].specs).toEqual([]);
  });
});
