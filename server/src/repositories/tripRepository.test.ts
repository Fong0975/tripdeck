import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addLocation,
  create,
  deleteById,
  deleteLocation,
  findAll,
  findById,
  findContent,
  findDayByIdAndTripId,
  updateLocation,
} from './tripRepository';

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

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

const mockGetAttractionImagesBatch = vi.fn().mockResolvedValue(new Map());
const mockGetConnectionImagesBatch = vi.fn().mockResolvedValue(new Map());
vi.mock('./imageRepository', () => ({
  getAttractionImagesBatch: (...args: unknown[]) =>
    mockGetAttractionImagesBatch(...args),
  getConnectionImagesBatch: (...args: unknown[]) =>
    mockGetConnectionImagesBatch(...args),
}));

/** Wires pool.execute to answer each of findContent's queries by SQL substring. */
function mockFindContentQueries(opts: {
  trip: Record<string, unknown> | null;
  days: Record<string, unknown>[];
  attractions?: Record<string, unknown>[];
  websites?: Record<string, unknown>[];
  connections?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
}) {
  mockPoolExecute.mockImplementation((sql: string) => {
    if (sql.includes('FROM trips')) {
      return Promise.resolve([opts.trip ? [opts.trip] : []]);
    }
    if (sql.includes('trip_attraction_websites')) {
      return Promise.resolve([opts.websites ?? []]);
    }
    if (sql.includes('trip_attractions')) {
      return Promise.resolve([opts.attractions ?? []]);
    }
    if (sql.includes('trip_connections')) {
      return Promise.resolve([opts.connections ?? []]);
    }
    if (sql.includes('trip_day_locations')) {
      return Promise.resolve([opts.locations ?? []]);
    }
    if (sql.includes('trip_days')) {
      return Promise.resolve([opts.days]);
    }
    return Promise.resolve([[]]);
  });
}

describe('tripRepository', () => {
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
    mockGetAttractionImagesBatch.mockResolvedValue(new Map());
    mockGetConnectionImagesBatch.mockResolvedValue(new Map());
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

  describe('findContent', () => {
    it('returns null when the trip is not found', async () => {
      mockFindContentQueries({ trip: null, days: [] });

      const result = await findContent(999);

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('returns an empty days array without further queries when the trip has zero days', async () => {
      const trip = {
        id: 5,
        title: 'Trip',
        destination: null,
        start_date: '2026-07-01',
        end_date: '2026-07-02',
        description: null,
        created_at: '2026-07-01T00:00:00.000Z',
      };
      mockFindContentQueries({ trip, days: [] });

      const result = await findContent(5);

      expect(result).toEqual({ tripId: 5, days: [] });
      expect(mockPoolExecute).toHaveBeenCalledTimes(2);
      expect(mockGetAttractionImagesBatch).not.toHaveBeenCalled();
      expect(mockGetConnectionImagesBatch).not.toHaveBeenCalled();
    });

    it('aggregates days with attractions, websites, connections, locations, and images grouped by day', async () => {
      const trip = {
        id: 5,
        title: 'Trip',
        destination: null,
        start_date: '2026-07-01',
        end_date: '2026-07-02',
        description: null,
        created_at: '2026-07-01T00:00:00.000Z',
      };
      const days = [
        { id: 10, trip_id: 5, day: 1, date: '2026-07-01' },
        { id: 20, trip_id: 5, day: 2, date: '2026-07-02' },
      ];
      const attractions = [
        {
          id: 100,
          trip_day_id: 10,
          name: 'Attraction A',
          google_map_url: 'https://maps.example/a',
          notes: 'note a',
          nearby_attractions: 'nearby a',
          start_time: '09:00',
          end_time: '10:00',
          sort_order: 0,
        },
        {
          id: 101,
          trip_day_id: 10,
          name: 'Attraction B',
          google_map_url: null,
          notes: null,
          nearby_attractions: null,
          start_time: null,
          end_time: null,
          sort_order: 1,
        },
      ];
      const websites = [
        {
          id: 1,
          trip_attraction_id: 100,
          url: 'https://site.example',
          title: 'Site',
        },
      ];
      const connections = [
        {
          id: 500,
          trip_day_id: 10,
          trip_attraction_id_from: 100,
          trip_attraction_id_to: 101,
          transport_mode: 'walk',
          duration: '10min',
          route: 'route',
          notes: 'notes',
        },
      ];
      const locations = [
        { id: 900, trip_day_id: 10, name: 'Place A', sort_order: 0 },
        { id: 901, trip_day_id: 20, name: 'Place B', sort_order: 0 },
      ];
      mockFindContentQueries({
        trip,
        days,
        attractions,
        websites,
        connections,
        locations,
      });
      mockGetAttractionImagesBatch.mockResolvedValueOnce(
        new Map([[100, [{ id: 1, filename: 'a.jpg', title: 'Img A' }]]]),
      );
      mockGetConnectionImagesBatch.mockResolvedValueOnce(
        new Map([[500, [{ id: 2, filename: 'c.jpg', title: 'Img C' }]]]),
      );

      const result = await findContent(5);

      expect(result).toEqual({
        tripId: 5,
        days: [
          {
            id: 10,
            day: 1,
            date: '2026-07-01',
            locations: [{ id: 900, name: 'Place A' }],
            attractions: [
              {
                id: 100,
                name: 'Attraction A',
                googleMapUrl: 'https://maps.example/a',
                notes: 'note a',
                nearbyAttractions: 'nearby a',
                startTime: '09:00',
                endTime: '10:00',
                referenceWebsites: [
                  { url: 'https://site.example', title: 'Site' },
                ],
                images: [{ id: 1, filename: 'a.jpg', title: 'Img A' }],
                sortOrder: 0,
              },
              {
                id: 101,
                name: 'Attraction B',
                googleMapUrl: null,
                notes: null,
                nearbyAttractions: null,
                startTime: null,
                endTime: null,
                referenceWebsites: [],
                images: [],
                sortOrder: 1,
              },
            ],
            connections: [
              {
                id: 500,
                fromAttractionId: 100,
                toAttractionId: 101,
                transportMode: 'walk',
                duration: '10min',
                route: 'route',
                notes: 'notes',
                images: [{ id: 2, filename: 'c.jpg', title: 'Img C' }],
              },
            ],
          },
          {
            id: 20,
            day: 2,
            date: '2026-07-02',
            locations: [{ id: 901, name: 'Place B' }],
            attractions: [],
            connections: [],
          },
        ],
      });
      expect(mockGetAttractionImagesBatch).toHaveBeenCalledWith([100, 101]);
      expect(mockGetConnectionImagesBatch).toHaveBeenCalledWith([500]);
      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('trip_attraction_websites'),
        [100, 101],
      );
    });

    it('skips the websites query entirely when there are zero attractions', async () => {
      const trip = {
        id: 5,
        title: 'Trip',
        destination: null,
        start_date: '2026-07-01',
        end_date: '2026-07-01',
        description: null,
        created_at: '2026-07-01T00:00:00.000Z',
      };
      const days = [{ id: 10, trip_id: 5, day: 1, date: '2026-07-01' }];
      mockFindContentQueries({
        trip,
        days,
        attractions: [],
        connections: [],
        locations: [],
      });

      const result = await findContent(5);

      expect(result?.days[0]).toEqual({
        id: 10,
        day: 1,
        date: '2026-07-01',
        locations: [],
        attractions: [],
        connections: [],
      });
      const websiteCalls = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('trip_attraction_websites'),
      );
      expect(websiteCalls).toHaveLength(0);
      // trips, trip_days, trip_attractions, trip_connections, trip_day_locations
      expect(mockPoolExecute).toHaveBeenCalledTimes(5);
    });
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
