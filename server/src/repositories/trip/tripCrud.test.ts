import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../attraction/attractionCrud');

import * as attractionCrud from '../attraction/attractionCrud';

import { create, deleteById, findAll, findById, update } from './tripCrud';

const mockGetTripImages = vi.fn().mockResolvedValue([]);
const mockGetTripImagesBatch = vi.fn().mockResolvedValue(new Map());
vi.mock('../imageRepository', () => ({
  getTripImages: (...args: unknown[]) => mockGetTripImages(...args),
  getTripImagesBatch: (...args: unknown[]) => mockGetTripImagesBatch(...args),
}));

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

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
    mockGetTripImages.mockResolvedValue([]);
    mockGetTripImagesBatch.mockResolvedValue(new Map());
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
            images: [],
          },
        ]);
        expect(mockPoolExecute).toHaveBeenCalledWith(
          'SELECT * FROM trips ORDER BY created_at DESC',
        );
      },
    );

    it('attaches batch-fetched images to their matching trip', async () => {
      const rowA = {
        id: 1,
        title: 'Trip A',
        destination: 'Tokyo',
        description: null,
        start_date: '2026-05-01',
        end_date: '2026-05-03',
        created_at: '2026-01-01T00:00:00.000Z',
      };
      const rowB = { ...rowA, id: 2, title: 'Trip B' };
      mockPoolExecute.mockResolvedValueOnce([[rowA, rowB]]);
      const images = [{ id: 9, filename: 'a.jpg', title: 'A' }];
      mockGetTripImagesBatch.mockResolvedValueOnce(new Map([[1, images]]));

      const result = await findAll();

      expect(mockGetTripImagesBatch).toHaveBeenCalledWith([1, 2]);
      expect(result[0].images).toEqual(images);
      expect(result[1].images).toEqual([]);
    });
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
          images: [],
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
      expect(mockGetTripImages).not.toHaveBeenCalled();
    });

    it('attaches images fetched for the trip', async () => {
      mockPoolExecute.mockResolvedValueOnce([
        [
          {
            id: 7,
            title: 'Trip B',
            destination: null,
            description: null,
            start_date: '2026-06-01',
            end_date: '2026-06-05',
            created_at: '2026-06-01T08:30:00.000Z',
          },
        ],
      ]);
      const images = [{ id: 9, filename: 'a.jpg', title: 'A' }];
      mockGetTripImages.mockResolvedValueOnce(images);

      const result = await findById(7);

      expect(mockGetTripImages).toHaveBeenCalledWith(7);
      expect(result?.images).toEqual(images);
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
        images: [],
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

  describe('update', () => {
    function tripRow(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: 10,
        title: 'Old Title',
        destination: 'Osaka',
        start_date: '2026-08-01',
        end_date: '2026-08-03',
        description: 'old desc',
        created_at: '2026-01-01T00:00:00.000Z',
        ...overrides,
      };
    }

    function dayRow(id: number, day: number, date: string) {
      return { id, trip_id: 10, day, date };
    }

    beforeEach(() => {
      vi.mocked(attractionCrud.deleteById).mockResolvedValue(true);
      mockConnExecute.mockImplementation(() =>
        Promise.resolve([{ affectedRows: 1 }]),
      );
    });

    it('returns null and does not open a transaction when the trip does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await update(999, { title: 'New' });

      expect(result).toBeNull();
      expect(mockGetConnection).not.toHaveBeenCalled();
      expect(attractionCrud.deleteById).not.toHaveBeenCalled();
    });

    it('updates non-date fields without touching trip_days when dates are unchanged', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([[tripRow()]]) // initial fetch
        .mockResolvedValueOnce([
          [
            dayRow(101, 1, '2026-08-01'),
            dayRow(102, 2, '2026-08-02'),
            dayRow(103, 3, '2026-08-03'),
          ],
        ]) // trip_days
        .mockResolvedValueOnce([
          [tripRow({ title: 'New Title', destination: 'Kyoto' })],
        ]); // fresh fetch
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 101 }, { id: 102 }, { id: 103 }],
      ]);

      const result = await update(10, {
        title: 'New Title',
        destination: 'Kyoto',
      });

      expect(attractionCrud.deleteById).not.toHaveBeenCalled();
      const dayDeletes = mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('DELETE FROM trip_days'),
      );
      expect(dayDeletes).toHaveLength(0);
      const dayInserts = mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('INSERT INTO trip_days'),
      );
      expect(dayInserts).toHaveLength(0);

      const renumbers = mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('UPDATE trip_days SET day = ? WHERE id'),
      );
      expect(renumbers.map(([, params]) => params)).toEqual([
        [1, 101],
        [2, 102],
        [3, 103],
      ]);

      const tripUpdate = mockConnExecute.mock.calls.find(([sql]) =>
        (sql as string).includes('UPDATE trips SET'),
      );
      expect(tripUpdate?.[1]).toEqual([
        'New Title',
        'Kyoto',
        '2026-08-01',
        '2026-08-03',
        'old desc',
        10,
      ]);

      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
      expect(result?.title).toBe('New Title');
    });

    it('attaches freshly-fetched images to the updated trip', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([[tripRow()]]) // initial fetch
        .mockResolvedValueOnce([
          [
            dayRow(101, 1, '2026-08-01'),
            dayRow(102, 2, '2026-08-02'),
            dayRow(103, 3, '2026-08-03'),
          ],
        ]) // trip_days
        .mockResolvedValueOnce([[tripRow()]]); // fresh fetch
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 101 }, { id: 102 }, { id: 103 }],
      ]);
      const images = [{ id: 9, filename: 'a.jpg', title: 'A' }];
      mockGetTripImages.mockResolvedValueOnce(images);

      const result = await update(10, { title: 'New Title' });

      expect(mockGetTripImages).toHaveBeenCalledWith(10);
      expect(result?.images).toEqual(images);
    });

    it('expands the date range by inserting trip_days for newly added dates', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-09-01', end_date: '2026-09-03' })],
        ])
        .mockResolvedValueOnce([
          [
            dayRow(201, 1, '2026-09-01'),
            dayRow(202, 2, '2026-09-02'),
            dayRow(203, 3, '2026-09-03'),
          ],
        ])
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-09-01', end_date: '2026-09-05' })],
        ]);
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 201 }, { id: 202 }, { id: 203 }, { id: 301 }, { id: 302 }],
      ]);

      await update(10, { endDate: '2026-09-05' });

      expect(attractionCrud.deleteById).not.toHaveBeenCalled();
      const dayInserts = mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('INSERT INTO trip_days'),
      );
      expect(dayInserts).toHaveLength(2);
      expect(dayInserts[0][1]).toEqual([10, -1, '2026-09-04']);
      expect(dayInserts[1][1]).toEqual([10, -2, '2026-09-05']);
    });

    it('shrinks the date range, deleting attractions/connections/images for removed days before removing them', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-10-01', end_date: '2026-10-05' })],
        ])
        .mockResolvedValueOnce([
          [
            dayRow(401, 1, '2026-10-01'),
            dayRow(402, 2, '2026-10-02'),
            dayRow(403, 3, '2026-10-03'),
            dayRow(404, 4, '2026-10-04'),
            dayRow(405, 5, '2026-10-05'),
          ],
        ])
        .mockResolvedValueOnce([[{ id: 9001 }, { id: 9002 }]]) // attractions for day 404
        .mockResolvedValueOnce([[{ id: 9003 }]]) // attractions for day 405
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-10-01', end_date: '2026-10-03' })],
        ]);
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 401 }, { id: 402 }, { id: 403 }],
      ]);

      await update(10, { endDate: '2026-10-03' });

      expect(vi.mocked(attractionCrud.deleteById).mock.calls).toEqual([
        [9001],
        [9002],
        [9003],
      ]);
      const dayDeletes = mockConnExecute.mock.calls
        .filter(([sql]) => (sql as string).includes('DELETE FROM trip_days'))
        .map(([, params]) => params);
      expect(dayDeletes).toEqual([[404], [405]]);
    });

    it('moves the start date forward, removing leading days and renumbering the rest starting at 1', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-11-01', end_date: '2026-11-05' })],
        ])
        .mockResolvedValueOnce([
          [
            dayRow(501, 1, '2026-11-01'),
            dayRow(502, 2, '2026-11-02'),
            dayRow(503, 3, '2026-11-03'),
            dayRow(504, 4, '2026-11-04'),
            dayRow(505, 5, '2026-11-05'),
          ],
        ])
        .mockResolvedValueOnce([[{ id: 8001 }]]) // attractions for day 501
        .mockResolvedValueOnce([[]]) // no attractions for day 502
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-11-03', end_date: '2026-11-05' })],
        ]);
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 503 }, { id: 504 }, { id: 505 }],
      ]);

      await update(10, { startDate: '2026-11-03' });

      expect(vi.mocked(attractionCrud.deleteById).mock.calls).toEqual([[8001]]);
      const renumbers = mockConnExecute.mock.calls
        .filter(([sql]) =>
          (sql as string).includes('UPDATE trip_days SET day = ? WHERE id'),
        )
        .map(([, params]) => params);
      expect(renumbers).toEqual([
        [1, 503],
        [2, 504],
        [3, 505],
      ]);
    });

    it('shifts both start and end dates so the day count stays the same but the date set changes entirely', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-12-01', end_date: '2026-12-05' })],
        ])
        .mockResolvedValueOnce([
          [
            dayRow(601, 1, '2026-12-01'),
            dayRow(602, 2, '2026-12-02'),
            dayRow(603, 3, '2026-12-03'),
            dayRow(604, 4, '2026-12-04'),
            dayRow(605, 5, '2026-12-05'),
          ],
        ])
        .mockResolvedValueOnce([[]]) // attractions for day 601
        .mockResolvedValueOnce([[]]) // attractions for day 602
        .mockResolvedValueOnce([
          [
            tripRow({
              start_date: '2026-12-03',
              end_date: '2026-12-07',
            }),
          ],
        ]);
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 603 }, { id: 604 }, { id: 605 }, { id: 701 }, { id: 702 }],
      ]);

      await update(10, { startDate: '2026-12-03', endDate: '2026-12-07' });

      const dayDeletes = mockConnExecute.mock.calls
        .filter(([sql]) => (sql as string).includes('DELETE FROM trip_days'))
        .map(([, params]) => params);
      expect(dayDeletes).toEqual([[601], [602]]);

      const dayInserts = mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('INSERT INTO trip_days'),
      );
      expect(dayInserts).toHaveLength(2);
      expect(dayInserts[0][1]).toEqual([10, -1, '2026-12-06']);
      expect(dayInserts[1][1]).toEqual([10, -2, '2026-12-07']);
    });

    it('rolls back the transaction and rethrows when a query fails mid-transaction', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([[tripRow()]])
        .mockResolvedValueOnce([
          [
            dayRow(101, 1, '2026-08-01'),
            dayRow(102, 2, '2026-08-02'),
            dayRow(103, 3, '2026-08-03'),
          ],
        ]);
      mockConnQuery.mockResolvedValueOnce([
        [{ id: 101 }, { id: 102 }, { id: 103 }],
      ]);
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE trips SET')) {
          return Promise.reject(new Error('db error'));
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      await expect(update(10, { title: 'Broken' })).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
      expect(mockConnRelease).toHaveBeenCalled();
    });

    it('does not open a transaction if deleting an attraction for a removed day fails', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([
          [tripRow({ start_date: '2026-10-01', end_date: '2026-10-04' })],
        ])
        .mockResolvedValueOnce([
          [
            dayRow(401, 1, '2026-10-01'),
            dayRow(402, 2, '2026-10-02'),
            dayRow(403, 3, '2026-10-03'),
            dayRow(404, 4, '2026-10-04'),
          ],
        ])
        .mockResolvedValueOnce([[{ id: 9001 }]]); // attractions for day 404
      vi.mocked(attractionCrud.deleteById).mockRejectedValueOnce(
        new Error('delete failed'),
      );

      await expect(update(10, { endDate: '2026-10-03' })).rejects.toThrow(
        'delete failed',
      );

      expect(mockGetConnection).not.toHaveBeenCalled();
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

    it('deletes every image on disk when the trip is deleted', async () => {
      mockGetTripImages.mockResolvedValueOnce([
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ]);
      mockPoolExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await deleteById(5);

      expect(result).toBe(true);
      expect(mockDeleteImageFromDisk).toHaveBeenNthCalledWith(1, 'a.jpg');
      expect(mockDeleteImageFromDisk).toHaveBeenNthCalledWith(2, 'b.jpg');
    });

    it('does not touch disk when the trip does not exist', async () => {
      mockGetTripImages.mockResolvedValueOnce([
        { id: 1, filename: 'a.jpg', title: 'A' },
      ]);
      mockPoolExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await deleteById(999);

      expect(result).toBe(false);
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });
  });
});
