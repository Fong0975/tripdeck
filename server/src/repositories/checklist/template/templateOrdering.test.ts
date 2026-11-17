import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import {
  categoryExists,
  reorderCategories,
} from './templateCategoryRepository';
import { moveItem, reorderItems } from './templateItemRepository';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;
const { execute: mockConnExecute } = db.conn;

describe('template ordering repositories', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockConnExecute.mockReset();
  });

  describe('reorderCategories / reorderItems', () => {
    it.each([
      {
        name: 'reorderCategories',
        run: () => reorderCategories([2, 1]),
        lockFragment: 'FROM checklist_template_categories',
      },
      {
        name: 'reorderItems',
        run: () => reorderItems(4, [2, 1]),
        lockFragment:
          'FROM checklist_template_items WHERE checklist_template_category_id = ?',
      },
    ])(
      '$name renumbers the locked sibling group',
      async ({ run, lockFragment }) => {
        mockConnExecute.mockResolvedValue([[{ id: 1 }, { id: 2 }]]);

        await expect(run()).resolves.toBe('reordered');

        expect(String(mockConnExecute.mock.calls[0][0])).toContain(
          lockFragment,
        );
        expect(String(mockConnExecute.mock.calls[1][0])).toContain(
          'SET sort_order = CASE id',
        );
      },
    );

    it('reorderItems reports invalid_order for a stale list', async () => {
      mockConnExecute.mockResolvedValue([[{ id: 1 }, { id: 2 }, { id: 3 }]]);

      await expect(reorderItems(4, [1, 2])).resolves.toBe('invalid_order');
      expect(mockConnExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('categoryExists', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])('returns $expected for rows $rows', async ({ rows, expected }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      await expect(categoryExists(1)).resolves.toBe(expected);
    });
  });

  describe('moveItem', () => {
    it.each([
      {
        name: 'the target category is missing',
        targetRows: [],
        nextOrder: 0,
        affectedRows: 1,
        expected: 'category_not_found',
        statements: 1,
      },
      {
        name: 'the item does not exist',
        targetRows: [{ id: 9 }],
        nextOrder: 2,
        affectedRows: 0,
        expected: 'item_not_found',
        statements: 3,
      },
      {
        name: 'both exist',
        targetRows: [{ id: 9 }],
        nextOrder: 2,
        affectedRows: 1,
        expected: 'moved',
        statements: 3,
      },
    ])(
      'returns $expected when $name',
      async ({ targetRows, nextOrder, affectedRows, expected, statements }) => {
        mockConnExecute
          .mockResolvedValueOnce([targetRows])
          .mockResolvedValueOnce([[{ next_order: nextOrder }]])
          .mockResolvedValueOnce([{ affectedRows }]);

        await expect(moveItem(5, 9)).resolves.toBe(expected);

        expect(mockConnExecute).toHaveBeenCalledTimes(statements);
        if (statements === 3) {
          expect(mockConnExecute).toHaveBeenLastCalledWith(
            'UPDATE checklist_template_items SET checklist_template_category_id = ?, sort_order = ? WHERE id = ?',
            [9, nextOrder, 5],
          );
        }
      },
    );
  });
});
