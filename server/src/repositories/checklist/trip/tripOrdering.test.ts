import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { reorderTripCategories } from './tripCategoryRepository';
import { moveTripItem, reorderTripItems } from './tripItemRepository';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const { execute: mockConnExecute } = db.conn;

describe('trip ordering repositories', () => {
  beforeEach(() => {
    mockConnExecute.mockReset();
  });

  it.each([
    {
      name: 'reorderTripCategories',
      run: () => reorderTripCategories(3, [2, 1]),
      lockFragment: 'FROM checklist_trip_categories WHERE trip_id = ?',
      lockParams: [3],
    },
    {
      name: 'reorderTripItems',
      run: () => reorderTripItems(8, [2, 1]),
      lockFragment:
        'FROM checklist_trip_items WHERE checklist_trip_category_id = ?',
      lockParams: [8],
    },
  ])(
    '$name renumbers the locked sibling group',
    async ({ run, lockFragment, lockParams }) => {
      mockConnExecute.mockResolvedValue([[{ id: 1 }, { id: 2 }]]);

      await expect(run()).resolves.toBe('reordered');

      expect(String(mockConnExecute.mock.calls[0][0])).toContain(lockFragment);
      expect(mockConnExecute.mock.calls[0][1]).toEqual(lockParams);
      expect(String(mockConnExecute.mock.calls[1][0])).toContain(
        'SET sort_order = CASE id',
      );
    },
  );

  describe('moveTripItem', () => {
    it.each([
      {
        name: 'the target category is not in the trip',
        categoryRows: [],
        itemRows: [{ id: 5 }],
        expected: 'category_not_found',
        statements: 1,
      },
      {
        name: 'the item is not in the trip',
        categoryRows: [{ id: 9 }],
        itemRows: [],
        expected: 'item_not_found',
        statements: 2,
      },
      {
        name: 'both belong to the trip',
        categoryRows: [{ id: 9 }],
        itemRows: [{ id: 5 }],
        expected: 'moved',
        statements: 4,
      },
    ])(
      'returns $expected when $name',
      async ({ categoryRows, itemRows, expected, statements }) => {
        mockConnExecute
          .mockResolvedValueOnce([categoryRows])
          .mockResolvedValueOnce([itemRows])
          .mockResolvedValueOnce([[{ next_order: 3 }]])
          .mockResolvedValueOnce([{ affectedRows: 1 }]);

        await expect(moveTripItem(1, 5, 9)).resolves.toBe(expected);

        expect(mockConnExecute).toHaveBeenCalledTimes(statements);
        if (expected === 'moved') {
          expect(mockConnExecute).toHaveBeenLastCalledWith(
            'UPDATE checklist_trip_items SET checklist_trip_category_id = ?, sort_order = ? WHERE id = ?',
            [9, 3, 5],
          );
        }
      },
    );

    it('scopes both ownership checks to the trip', async () => {
      mockConnExecute
        .mockResolvedValueOnce([[{ id: 9 }]])
        .mockResolvedValueOnce([[{ id: 5 }]])
        .mockResolvedValueOnce([[{ next_order: 0 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await moveTripItem(1, 5, 9);

      expect(mockConnExecute.mock.calls[0][1]).toEqual([9, 1]);
      expect(mockConnExecute.mock.calls[1][1]).toEqual([5, 1]);
    });
  });
});
