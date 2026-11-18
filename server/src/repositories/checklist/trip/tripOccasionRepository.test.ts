import { describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../../../test-utils/dbMocks';

import {
  createOccasion,
  deleteOccasionIfNotLast,
  updateOccasion,
  verifyOccasionBelongsToTrip,
} from './tripOccasionRepository';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;
const mockConnExecute = db.conn.execute;

describe('tripOccasionRepository', () => {
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

      expect(result).toEqual({
        id: 900,
        name: '出發前',
        checks: {},
        specChecks: {},
      });
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
        if (sql.includes('checklist_spec_checks')) {
          return Promise.resolve([
            [
              {
                checklist_occasion_id: 1,
                checklist_trip_item_spec_id: 700,
                location: '託運',
              },
            ],
          ]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([
            [
              {
                checklist_occasion_id: 1,
                checklist_trip_item_id: 100,
                location: '託運',
              },
              {
                checklist_occasion_id: 1,
                checklist_trip_item_id: 100,
                location: '隨身',
              },
              {
                checklist_occasion_id: 1,
                checklist_trip_item_id: 101,
                location: '',
              },
            ],
          ]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateOccasion(1, '新名稱');

      expect(result).toEqual({
        id: 1,
        name: '新名稱',
        checks: { '100|託運': true, '100|隨身': true, '101|': true },
        specChecks: { '700|託運': true },
      });
    });
  });

  describe('deleteOccasionIfNotLast', () => {
    const DELETE_SQL = 'DELETE FROM checklist_occasions WHERE id = ?';

    it.each([
      {
        label: 'the trip does not exist',
        tripRows: [],
        occasionRows: [{ id: 2 }, { id: 3 }],
        expected: 'not_found',
        deletes: false,
      },
      {
        label: 'the occasion is not in the trip',
        tripRows: [{ id: 1 }],
        occasionRows: [{ id: 3 }, { id: 4 }],
        expected: 'not_found',
        deletes: false,
      },
      {
        label: 'it is the last occasion',
        tripRows: [{ id: 1 }],
        occasionRows: [{ id: 2 }],
        expected: 'last_occasion',
        deletes: false,
      },
      {
        label: 'other occasions remain',
        tripRows: [{ id: 1 }],
        occasionRows: [{ id: 2 }, { id: 3 }],
        expected: 'deleted',
        deletes: true,
      },
    ])(
      'returns $expected when $label',
      async ({ tripRows, occasionRows, expected, deletes }) => {
        routeSql(
          mockConnExecute,
          [
            ['FROM trips', [tripRows]],
            ['SELECT id FROM checklist_occasions', [occasionRows]],
          ],
          [{ affectedRows: 1 }],
        );

        const result = await deleteOccasionIfNotLast(1, 2);

        expect(result).toBe(expected);
        expect(mockConnExecute).toHaveBeenNthCalledWith(
          1,
          'SELECT id FROM trips WHERE id = ? FOR UPDATE',
          [1],
        );
        if (deletes) {
          expect(mockConnExecute).toHaveBeenCalledWith(DELETE_SQL, [2]);
        } else {
          expect(mockConnExecute).not.toHaveBeenCalledWith(
            DELETE_SQL,
            expect.anything(),
          );
        }
        expect(db.conn.commit).toHaveBeenCalled();
        expect(mockPoolExecute).not.toHaveBeenCalled();
      },
    );

    it('rolls back and rethrows when a query fails', async () => {
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(deleteOccasionIfNotLast(1, 2)).rejects.toThrow('db error');

      expect(db.conn.rollback).toHaveBeenCalled();
      expect(db.conn.commit).not.toHaveBeenCalled();
    });
  });
});
