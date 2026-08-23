import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTripItemSpec,
  deleteTripItemSpec,
  updateTripItemSpec,
  verifyTripSpecBelongsToItem,
} from './tripItemSpecRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

describe('tripItemSpecRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyTripSpecBelongsToItem', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyTripSpecBelongsToItem(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripItemSpec', () => {
    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await createTripItemSpec(999, { name: '防水' });

      expect(result).toBeNull();
    });

    it('inserts a spec and defaults storage_location to null when omitted', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 1 }]]);
        }
        return Promise.resolve([{ insertId: 700 }]);
      });

      const result = await createTripItemSpec(1, { name: '防水' });

      expect(result).toEqual({ id: 700, name: '防水', storage_location: null });
    });
  });

  describe('updateTripItemSpec', () => {
    const CURRENT_SPEC = {
      id: 1,
      checklist_trip_item_id: 100,
      name: '舊名稱',
      storage_location: '舊位置',
    };

    it('returns null when the spec does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateTripItemSpec(999, { name: '新名稱' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'storage_location omitted falls back to the current value',
        data: { name: '新名稱' },
        expected: CURRENT_SPEC.storage_location,
      },
      {
        name: 'storage_location provided overrides the current value',
        data: { name: '新名稱', storage_location: '新位置' },
        expected: '新位置',
      },
    ])('$name', async ({ data, expected }) => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[CURRENT_SPEC]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateTripItemSpec(1, data);

      expect(result?.storage_location).toBe(expected);
    });
  });

  describe('deleteTripItemSpec', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripItemSpec(1);

        expect(result).toBe(expected);
      },
    );
  });
});
