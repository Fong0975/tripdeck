import { describe, expect, it, vi } from 'vitest';

import { db } from '../../test-utils/dbMocks';

import {
  getDayIdForAttraction,
  verifyBelongsToTrip,
} from './attractionQueries';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

describe('attractionQueries', () => {
  describe('getDayIdForAttraction', () => {
    it.each([
      {
        description: 'rows found',
        rows: [{ trip_day_id: 42 }],
        expectThrow: false,
      },
      { description: 'rows empty', rows: [], expectThrow: true },
    ])('$description', async ({ rows, expectThrow }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      if (expectThrow) {
        await expect(getDayIdForAttraction(1)).rejects.toThrow(
          'Attraction not found',
        );
      } else {
        await expect(getDayIdForAttraction(1)).resolves.toBe(42);
      }
      expect(mockPoolExecute).toHaveBeenCalledWith(
        'SELECT trip_day_id FROM trip_attractions WHERE id = ?',
        [1],
      );
    });
  });

  describe('verifyBelongsToTrip', () => {
    it.each([
      { description: 'rows.length > 0', rows: [{ id: 1 }], expected: true },
      { description: 'rows.length === 0', rows: [], expected: false },
    ])('$description', async ({ rows, expected }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      await expect(verifyBelongsToTrip(1, 2)).resolves.toBe(expected);
      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ta.id = ? AND td.trip_id = ?'),
        [1, 2],
      );
    });
  });
});
