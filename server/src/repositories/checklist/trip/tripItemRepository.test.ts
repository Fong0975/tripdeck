import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTripItem,
  deleteTripItem,
  setCheck,
  updateTripItem,
  verifyItemBelongsToTrip,
} from './tripItemRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

describe('tripItemRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyItemBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyItemBelongsToTrip(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripItem', () => {
    it('defaults quantity/notes/storage_location to null when omitted from input', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 100 }]);

      const result = await createTripItem(10, { name: '外套' });

      expect(result).toEqual({
        id: 100,
        name: '外套',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
    });

    it('carries through quantity/notes/storage_location when provided', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 101 }]);

      const result = await createTripItem(10, {
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
      });

      expect(result).toEqual({
        id: 101,
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
        specs: [],
      });
    });
  });

  describe('deleteTripItem', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripItem(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('updateTripItem', () => {
    const CURRENT_ITEM = {
      id: 1,
      checklist_trip_category_id: 10,
      name: '舊名稱',
      quantity: 1,
      notes: '舊備註',
      storage_location: '舊位置',
    };

    function mockSelectThenUpdate(row = CURRENT_ITEM) {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[row]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateTripItem(999, {});

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'name omitted keeps the current value',
        data: {},
        expected: CURRENT_ITEM.name,
      },
      {
        name: 'name provided as a non-empty string overrides the current value',
        data: { name: '新名稱' },
        expected: '新名稱',
      },
      {
        name: 'name provided as an empty string falls back to the current value',
        data: { name: '' },
        expected: CURRENT_ITEM.name,
      },
    ])('$name', async ({ data, expected }) => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, data);

      expect(result?.name).toBe(expected);
    });

    it('keeps the current quantity when quantity is omitted from data', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, {});

      expect(result?.quantity).toBe(CURRENT_ITEM.quantity);
    });

    it('overrides notes when notes is provided in data', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, { notes: '新備註' });

      expect(result?.notes).toBe('新備註');
    });
  });

  describe('setCheck', () => {
    it('issues an INSERT ... ON DUPLICATE KEY UPDATE when checked is true', async () => {
      mockPoolExecute.mockResolvedValue([{}]);

      await setCheck(1, 100, true);

      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE checked = 1'),
        [1, 100],
      );
    });

    it('issues a DELETE FROM checklist_checks when checked is false', async () => {
      mockPoolExecute.mockResolvedValue([{}]);

      await setCheck(1, 100, false);

      expect(mockPoolExecute).toHaveBeenCalledWith(
        'DELETE FROM checklist_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_id = ?',
        [1, 100],
      );
    });
  });
});
