import { describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../../test-utils/dbMocks';

import {
  addLocation,
  deleteLocation,
  updateLocation,
  verifyLocationBelongsToTrip,
} from './tripDayLocation';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;
const mockConnExecute = db.conn.execute;

describe('tripDayLocation', () => {
  describe('addLocation', () => {
    it.each([
      { name: 'an empty day', nextOrder: 0 },
      { name: 'a day with a gap left by a deleted location', nextOrder: 4 },
    ])(
      'inserts with the MAX-based sort_order for $name inside a transaction and trims the name',
      async ({ nextOrder }) => {
        routeSql(
          mockConnExecute,
          [
            ['FOR UPDATE', [[{ id: 10 }]]],
            ['MAX(sort_order)', [[{ next_order: nextOrder }]]],
          ],
          [{ insertId: 55 }],
        );

        const result = await addLocation(10, { name: '  Place X  ' });

        expect(result).toEqual({ id: 55, name: 'Place X' });
        expect(mockConnExecute).toHaveBeenCalledWith(
          'SELECT id FROM trip_days WHERE id = ? FOR UPDATE',
          [10],
        );
        expect(mockConnExecute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO trip_day_locations'),
          [10, 'Place X', nextOrder],
        );
        expect(db.conn.commit).toHaveBeenCalled();
        expect(mockPoolExecute).not.toHaveBeenCalled();
      },
    );

    it('rolls back and rethrows when the insert fails', async () => {
      mockConnExecute
        .mockResolvedValueOnce([[{ id: 10 }]])
        .mockResolvedValueOnce([[{ next_order: 0 }]])
        .mockRejectedValueOnce(new Error('insert failed'));

      await expect(addLocation(10, { name: 'Place X' })).rejects.toThrow(
        'insert failed',
      );

      expect(db.conn.rollback).toHaveBeenCalled();
      expect(db.conn.commit).not.toHaveBeenCalled();
    });
  });

  describe('verifyLocationBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 300 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValueOnce([rows]);

        const result = await verifyLocationBelongsToTrip(300, 1);

        expect(result).toBe(expected);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          expect.stringContaining('td.trip_id = ?'),
          [300, 1],
        );
      },
    );
  });

  describe('updateLocation', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows, and trims the name',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValueOnce([{ affectedRows }]);

        const result = await updateLocation(20, { name: '  New Name  ' });

        expect(result).toBe(expected);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'UPDATE trip_day_locations SET name = ? WHERE id = ?',
          ['New Name', 20],
        );
      },
    );
  });

  describe('deleteLocation', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValueOnce([{ affectedRows }]);

        const result = await deleteLocation(30);

        expect(result).toBe(expected);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'DELETE FROM trip_day_locations WHERE id = ?',
          [30],
        );
      },
    );
  });
});
