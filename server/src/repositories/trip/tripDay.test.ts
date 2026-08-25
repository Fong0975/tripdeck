import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findDayByIdAndTripId, updateDayNotes } from './tripDay';

const mockPoolExecute = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findDayByIdAndTripId', () => {
  it.each([
    {
      label: 'a Date object',
      date: new Date(2026, 4, 1),
      expectedDate: '2026-05-01',
    },
    {
      label: 'a formatted string',
      date: '2026-06-01T00:00:00.000Z',
      expectedDate: '2026-06-01',
    },
  ])(
    'returns the day with $label date formatted via toDateString',
    async ({ date, expectedDate }) => {
      const row = { id: 10, trip_id: 5, day: 2, date };
      mockPoolExecute.mockResolvedValueOnce([[row]]);

      const result = await findDayByIdAndTripId(5, 10);

      expect(result).toEqual({ id: 10, day: 2, date: expectedDate });
    },
  );

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

  it('accepts null to clear notes', async () => {
    mockPoolExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await updateDayNotes(10, null);

    expect(mockPoolExecute).toHaveBeenCalledWith(expect.any(String), [
      null,
      10,
    ]);
  });
});
