import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addLocation, deleteLocation, updateLocation } from './tripDayLocation';

const mockPoolExecute = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

describe('tripDayLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addLocation', () => {
    it('derives sortOrder from the COUNT(*) query and trims the returned name', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ cnt: 3 }]]);
        }
        return Promise.resolve([{ insertId: 55 }]);
      });

      const result = await addLocation(10, { name: '  Place X  ' });

      expect(result).toEqual({ id: 55, name: 'Place X' });
      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trip_day_locations'),
        [10, 'Place X', 3],
      );
    });
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
