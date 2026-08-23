import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findContent } from './tripContent';

const mockPoolExecute = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

const mockGetAttractionImagesBatch = vi.fn().mockResolvedValue(new Map());
const mockGetConnectionImagesBatch = vi.fn().mockResolvedValue(new Map());
vi.mock('../imageRepository', () => ({
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

describe('tripContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAttractionImagesBatch.mockResolvedValue(new Map());
    mockGetConnectionImagesBatch.mockResolvedValue(new Map());
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
});
