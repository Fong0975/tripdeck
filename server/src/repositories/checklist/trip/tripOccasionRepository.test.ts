import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOccasion,
  deleteOccasion,
  getOccasionCount,
  updateOccasion,
  verifyOccasionBelongsToTrip,
} from './tripOccasionRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

describe('tripOccasionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyOccasionBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyOccasionBelongsToTrip(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createOccasion', () => {
    it('returns the created occasion with an empty checks map', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 900 }]);

      const result = await createOccasion(5, '出發前');

      expect(result).toEqual({ id: 900, name: '出發前', checks: {} });
    });
  });

  describe('updateOccasion', () => {
    it('returns null when the occasion does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateOccasion(999, '新名稱');

      expect(result).toBeNull();
    });

    it('updates the name and returns a checks map built from the checked=1 rows', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM checklist_occasions')) {
          return Promise.resolve([[{ id: 1, trip_id: 5, name: '舊名稱' }]]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([
            [{ checklist_trip_item_id: 100 }, { checklist_trip_item_id: 101 }],
          ]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateOccasion(1, '新名稱');

      expect(result).toEqual({
        id: 1,
        name: '新名稱',
        checks: { 100: true, 101: true },
      });
    });
  });

  describe('getOccasionCount', () => {
    it('returns the count from the query result', async () => {
      mockPoolExecute.mockResolvedValue([[{ count: 3 }]]);

      const result = await getOccasionCount(5);

      expect(result).toBe(3);
    });
  });

  describe('deleteOccasion', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteOccasion(1);

        expect(result).toBe(expected);
      },
    );
  });
});
