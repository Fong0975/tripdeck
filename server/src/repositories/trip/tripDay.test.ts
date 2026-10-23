import { describe, expect, it, vi } from 'vitest';

import { db } from '../../test-utils/dbMocks';

import { findDayByIdAndTripId, updateDayNotes } from './tripDay';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

describe('findDayByIdAndTripId', () => {
  it('returns the day with its date formatted via toDateString', async () => {
    const row = { id: 10, trip_id: 5, day: 2, date: new Date(2026, 4, 1) };
    mockPoolExecute.mockResolvedValueOnce([[row]]);

    const result = await findDayByIdAndTripId(5, 10);

    expect(result).toEqual({ id: 10, day: 2, date: '2026-05-01' });
  });

  it('returns null when the day does not belong to the trip', async () => {
    mockPoolExecute.mockResolvedValueOnce([[]]);

    const result = await findDayByIdAndTripId(5, 999);

    expect(result).toBeNull();
    expect(mockPoolExecute).toHaveBeenCalledWith(
      'SELECT * FROM trip_days WHERE id = ? AND trip_id = ?',
      [999, 5],
    );
  });
});

describe('updateDayNotes', () => {
  it.each([
    { affectedRows: 1, expected: true },
    { affectedRows: 0, expected: false },
  ])(
    'returns $expected when affectedRows is $affectedRows',
    async ({ affectedRows, expected }) => {
      mockPoolExecute.mockResolvedValueOnce([{ affectedRows }]);

      const result = await updateDayNotes(10, 'new notes');

      expect(result).toBe(expected);
      expect(mockPoolExecute).toHaveBeenCalledWith(
        'UPDATE trip_days SET notes = ? WHERE id = ?',
        ['new notes', 10],
      );
    },
  );
});
