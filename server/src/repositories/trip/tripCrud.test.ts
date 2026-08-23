import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  create,
  deleteById,
  findAll,
  findById,
  findDayByIdAndTripId,
} from './tripCrud';

const mockPoolExecute = vi.fn();
const mockConnBeginTransaction = vi.fn();
const mockConnExecute = vi.fn();
const mockConnQuery = vi.fn();
const mockConnCommit = vi.fn();
const mockConnRollback = vi.fn();
const mockConnRelease = vi.fn();
const mockGetConnection = vi.fn().mockResolvedValue({
  beginTransaction: mockConnBeginTransaction,
  execute: mockConnExecute,
  query: mockConnQuery,
  commit: mockConnCommit,
  rollback: mockConnRollback,
  release: mockConnRelease,
});

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

describe('tripCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnection.mockResolvedValue({
      beginTransaction: mockConnBeginTransaction,
      execute: mockConnExecute,
      query: mockConnQuery,
      commit: mockConnCommit,
      rollback: mockConnRollback,
      release: mockConnRelease,
    });
  });

  // Shared date-field fixtures exercising both branches of the private
  // toDateString/toISOString helpers (Date objects vs. pre-formatted strings).
  const dateFieldCases = [
    {
      label: 'Date objects',
      dateFields: {
        start_date: new Date(2026, 4, 1),
        end_date: new Date(2026, 4, 3),
        created_at: new Date(2026, 4, 1, 8, 30, 0),
      },
      expected: {
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        createdAt: new Date(2026, 4, 1, 8, 30, 0).toISOString(),
      },
    },
    {
      label: 'formatted strings',
      dateFields: {
        start_date: '2026-06-01T00:00:00.000Z',
        end_date: '2026-06-05T00:00:00.000Z',
        created_at: '2026-06-01T08:30:00.000Z',
      },
      expected: {
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        createdAt: '2026-06-01T08:30:00.000Z',
      },
    },
  ];

  describe('findAll', () => {
    it.each(dateFieldCases)(
      'maps trip rows with $label date fields',
      async ({ dateFields, expected }) => {
        const row = {
          id: 1,
          title: 'Trip A',
          destination: 'Tokyo',
          description: 'desc',
          ...dateFields,
        };
        mockPoolExecute.mockResolvedValueOnce([[row]]);

        const result = await findAll();

        expect(result).toEqual([
          {
            id: 1,
            title: 'Trip A',
            destination: 'Tokyo',
            startDate: expected.startDate,
            endDate: expected.endDate,
            description: 'desc',
            createdAt: expected.createdAt,
          },
        ]);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'SELECT * FROM trips ORDER BY created_at DESC',
        );
      },
    );
  });

  describe('findById', () => {
    it.each(dateFieldCases)(
      'maps a trip row with $label date fields',
      async ({ dateFields, expected }) => {
        const row = {
          id: 7,
          title: 'Trip B',
          destination: null,
          description: null,
          ...dateFields,
        };
        mockPoolExecute.mockResolvedValueOnce([[row]]);

        const result = await findById(7);

        expect(result).toEqual({
          id: 7,
          title: 'Trip B',
          destination: null,
          startDate: expected.startDate,
          endDate: expected.endDate,
          description: null,
          createdAt: expected.createdAt,
        });
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'SELECT * FROM trips WHERE id = ?',
          [7],
        );
      },
    );

    it('returns null when the trip does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it.each([
      {
        label: 'single-day trip',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        expectedDates: ['2026-07-01'],
      },
      {
        label: 'multi-day trip',
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        expectedDates: ['2026-07-01', '2026-07-02', '2026-07-03'],
      },
    ])(
      'inserts one trip_days row per day for a $label',
      async ({ startDate, endDate, expectedDates }) => {
        mockConnExecute.mockImplementation((sql: string) => {
          if (sql.includes('INSERT INTO trips')) {
            return Promise.resolve([{ insertId: 42 }]);
          }
          return Promise.resolve([{ affectedRows: 1 }]);
        });
        mockPoolExecute.mockResolvedValueOnce([
          [
            {
              id: 42,
              title: 'New Trip',
              destination: null,
              start_date: startDate,
              end_date: endDate,
              description: null,
              created_at: '2026-07-01T00:00:00.000Z',
            },
          ],
        ]);

        await create({ title: 'New Trip', startDate, endDate });

        const dayInserts = mockConnExecute.mock.calls.filter(([sql]) =>
          (sql as string).includes('INSERT INTO trip_days'),
        );
        expect(dayInserts).toHaveLength(expectedDates.length);
        dayInserts.forEach(([, params], index) => {
          expect(params).toEqual([42, index + 1, expectedDates[index]]);
        });
      },
    );

    it('commits the transaction and returns the freshly selected trip on success', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO trips')) {
          return Promise.resolve([{ insertId: 42 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
      const freshTripRow = {
        id: 42,
        title: 'New Trip',
        destination: 'Osaka',
        start_date: '2026-07-01',
        end_date: '2026-07-01',
        description: null,
        created_at: '2026-07-01T00:00:00.000Z',
      };
      mockPoolExecute.mockResolvedValueOnce([[freshTripRow]]);

      const result = await create({
        title: 'New Trip',
        destination: 'Osaka',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
      });

      expect(mockConnBeginTransaction).toHaveBeenCalled();
      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
      expect(mockPoolExecute).toHaveBeenCalledWith(
        'SELECT * FROM trips WHERE id = ?',
        [42],
      );
      expect(result).toEqual({
        id: 42,
        title: 'New Trip',
        destination: 'Osaka',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        description: null,
        createdAt: '2026-07-01T00:00:00.000Z',
      });
      expect(mockConnRelease).toHaveBeenCalled();
    });

    it('rolls back the transaction and rethrows when a query fails mid-transaction', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO trips')) {
          return Promise.resolve([{ insertId: 42 }]);
        }
        return Promise.reject(new Error('db error'));
      });

      await expect(
        create({
          title: 'Bad Trip',
          startDate: '2026-07-01',
          endDate: '2026-07-02',
        }),
      ).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
      expect(mockConnRelease).toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValueOnce([{ affectedRows }]);

        const result = await deleteById(5);

        expect(result).toBe(expected);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'DELETE FROM trips WHERE id = ?',
          [5],
        );
      },
    );
  });

  describe('findDayByIdAndTripId', () => {
    it.each(dateFieldCases)(
      'returns the day with $label date field formatted via toDateString',
      async ({ dateFields, expected }) => {
        const row = { id: 10, trip_id: 5, day: 2, date: dateFields.start_date };
        mockPoolExecute.mockResolvedValueOnce([[row]]);

        const result = await findDayByIdAndTripId(5, 10);

        expect(result).toEqual({
          id: 10,
          day: 2,
          date: expected.startDate,
        });
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
});
