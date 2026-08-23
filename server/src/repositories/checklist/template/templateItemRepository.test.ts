import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createItem,
  deleteItem,
  updateItem,
  verifyItemBelongsToCategory,
} from './templateItemRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

function isSelectFrom(sql: unknown, table: string): boolean {
  return (
    (sql as string).trim().startsWith('SELECT') &&
    (sql as string).includes(table)
  );
}

const CURRENT_ITEM_ROW = {
  id: 1,
  checklist_template_category_id: 5,
  name: 'Old Item',
  quantity: 2,
  notes: 'old notes',
  storage_location: 'old location',
};

describe('templateItemRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createItem', () => {
    it('returns null and issues no INSERT when the category does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await createItem(999, { name: 'Item A' });

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('inserts an item and defaults quantity/notes/storage_location to null when omitted', async () => {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 3 }]]);
        }
        return Promise.resolve([{ insertId: 50 }]);
      });

      const result = await createItem(3, { name: 'Item A' });

      expect(result).toEqual({
        id: 50,
        name: 'Item A',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
    });
  });

  describe('updateItem', () => {
    function mockItemSelectThenUpdate(curRow = CURRENT_ITEM_ROW) {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if (isSelectFrom(sql, 'checklist_template_item_specs')) {
          return Promise.resolve([[]]);
        }
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[curRow]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await updateItem(999, { name: 'New Name' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'quantity omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 1,
        expectedParam: CURRENT_ITEM_ROW.quantity,
      },
      {
        name: 'quantity provided overrides the current value',
        data: { name: 'New Name', quantity: 9 },
        paramIndex: 1,
        expectedParam: 9,
      },
      {
        name: 'notes omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 2,
        expectedParam: CURRENT_ITEM_ROW.notes,
      },
      {
        name: 'notes provided overrides the current value',
        data: { name: 'New Name', notes: 'new notes' },
        paramIndex: 2,
        expectedParam: 'new notes',
      },
      {
        name: 'storage_location omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 3,
        expectedParam: CURRENT_ITEM_ROW.storage_location,
      },
      {
        name: 'storage_location provided overrides the current value',
        data: { name: 'New Name', storage_location: 'new location' },
        paramIndex: 3,
        expectedParam: 'new location',
      },
    ])('$name', async ({ data, paramIndex, expectedParam }) => {
      mockItemSelectThenUpdate();

      await updateItem(1, data);

      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      expect(updateCall?.[1][paramIndex]).toBe(expectedParam);
    });
  });

  describe('deleteItem', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteItem(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('verifyItemBelongsToCategory', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyItemBelongsToCategory(1, 10);

        expect(result).toBe(expected);
      },
    );
  });
});
