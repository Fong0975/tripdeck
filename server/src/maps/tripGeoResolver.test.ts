import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findGeoRowsForTrip: vi.fn(),
  saveGeo: vi.fn(),
  isGeocodingEnabled: vi.fn(),
  geocodeByName: vi.fn(),
  resolveCoordinatesFromLink: vi.fn(),
  getUsage: vi.fn(),
  markExhausted: vi.fn(),
  tryConsume: vi.fn(),
}));

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});
vi.mock('../repositories/attraction/attractionGeo', () => ({
  findGeoRowsForTrip: mocks.findGeoRowsForTrip,
  saveGeo: mocks.saveGeo,
}));
vi.mock('./config', () => ({
  getMapsConfig: () => ({ serverKey: 'server-key' }),
  isGeocodingEnabled: mocks.isGeocodingEnabled,
}));
vi.mock('./geocodeClient', async importOriginal => ({
  ...(await importOriginal<typeof import('./geocodeClient')>()),
  geocodeByName: mocks.geocodeByName,
}));
vi.mock('./linkResolver', () => ({
  resolveCoordinatesFromLink: mocks.resolveCoordinatesFromLink,
}));
vi.mock('./serialQueue', () => ({
  createSerialQueue: () => ({
    enqueue: (_key: string, task: () => Promise<unknown>) => task(),
  }),
}));
vi.mock('./usageTracker', () => ({
  getUsage: mocks.getUsage,
  markExhausted: mocks.markExhausted,
  tryConsume: mocks.tryConsume,
}));

import type { AttractionGeoRow } from '../repositories/attraction/attractionGeo';
import { mockLogger } from '../test-utils/loggerMock';

import { MapsQuotaError } from './geocodeClient';
import { computeGeoKey } from './geoKey';
import { MAX_GEOCODES_PER_REQUEST, resolveTripGeo } from './tripGeoResolver';

const TRIP_ID = 7;
const DAY_1 = 10;
const DAY_2 = 20;

function makeRow(overrides: Partial<AttractionGeoRow> = {}): AttractionGeoRow {
  return {
    id: 1,
    trip_day_id: DAY_1,
    name: 'Museum',
    google_map_url: null,
    latitude: null,
    longitude: null,
    geo_source: null,
    geo_key: null,
    ...overrides,
  } as AttractionGeoRow;
}

function makeResolvedRow(overrides: Partial<AttractionGeoRow> = {}) {
  const base = makeRow(overrides);
  return makeRow({
    latitude: 1,
    longitude: 2,
    geo_source: 'geocode',
    geo_key: computeGeoKey(base.name, base.google_map_url),
    ...overrides,
  });
}

const UNRESOLVED = (id: number) => ({
  id,
  latitude: null,
  longitude: null,
  geoSource: null,
});

describe('resolveTripGeo', () => {
  beforeEach(() => {
    mocks.findGeoRowsForTrip.mockReset();
    mocks.saveGeo.mockReset().mockResolvedValue(true);
    mocks.isGeocodingEnabled.mockReset().mockReturnValue(true);
    mocks.geocodeByName.mockReset().mockResolvedValue({ lat: 25, lng: 121 });
    mocks.resolveCoordinatesFromLink.mockReset().mockResolvedValue(null);
    mocks.getUsage
      .mockReset()
      .mockResolvedValue({ used: 0, limit: 200, exhausted: false });
    mocks.markExhausted.mockReset().mockResolvedValue(undefined);
    mocks.tryConsume.mockReset().mockResolvedValue(true);
  });

  it('returns already resolved rows without any lookup or write', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([makeResolvedRow({ id: 1 })]);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(result.attractions).toEqual([
      { id: 1, latitude: 1, longitude: 2, geoSource: 'geocode' },
    ]);
    expect(mocks.resolveCoordinatesFromLink).not.toHaveBeenCalled();
    expect(mocks.geocodeByName).not.toHaveBeenCalled();
    expect(mocks.saveGeo).not.toHaveBeenCalled();
  });

  it('treats a row whose stored key no longer matches as unresolved and hides its stale coordinates', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeResolvedRow({ id: 1, geo_key: 'stale' }),
    ]);
    mocks.isGeocodingEnabled.mockReturnValue(false);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(result.attractions).toEqual([UNRESOLVED(1)]);
  });

  it('resolves links for every day for free and stores them as url results', async () => {
    const rows = [
      makeRow({ id: 1, trip_day_id: DAY_1, google_map_url: 'https://a' }),
      makeRow({ id: 2, trip_day_id: DAY_2, google_map_url: 'https://b' }),
    ];
    mocks.findGeoRowsForTrip.mockResolvedValue(rows);
    mocks.resolveCoordinatesFromLink.mockResolvedValue({ lat: 3, lng: 4 });

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).not.toHaveBeenCalled();
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(mocks.saveGeo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
      {
        latitude: 3,
        longitude: 4,
        geoSource: 'url',
        geoKey: computeGeoKey('Museum', 'https://b'),
      },
    );
    expect(result.attractions).toEqual([
      { id: 1, latitude: 3, longitude: 4, geoSource: 'url' },
      { id: 2, latitude: 3, longitude: 4, geoSource: 'url' },
    ]);
  });

  it('geocodes by name only the requested day and stores the result', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1, name: 'A', trip_day_id: DAY_1 }),
      makeRow({ id: 2, name: 'B', trip_day_id: DAY_2 }),
    ]);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(1);
    expect(mocks.geocodeByName).toHaveBeenCalledWith('A', 'server-key');
    expect(mocks.saveGeo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      {
        latitude: 25,
        longitude: 121,
        geoSource: 'geocode',
        geoKey: computeGeoKey('A', null),
      },
    );
    expect(result.attractions).toEqual([
      { id: 1, latitude: 25, longitude: 121, geoSource: 'geocode' },
      UNRESOLVED(2),
    ]);
    expect(result.geocodeExhausted).toBe(false);
  });

  it('records not_found when Google has no match', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([makeRow({ id: 1 })]);
    mocks.geocodeByName.mockResolvedValue(null);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.saveGeo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({
        latitude: null,
        longitude: null,
        geoSource: 'not_found',
      }),
    );
    expect(result.attractions).toEqual([
      { id: 1, latitude: null, longitude: null, geoSource: 'not_found' },
    ]);
  });

  it('reuses a resolved sibling with the same name and link instead of calling Google', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeResolvedRow({ id: 1, trip_day_id: DAY_2 }),
      makeRow({ id: 2, trip_day_id: DAY_1 }),
    ]);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).not.toHaveBeenCalled();
    expect(mocks.tryConsume).not.toHaveBeenCalled();
    expect(result.attractions[1]).toEqual({
      id: 2,
      latitude: 1,
      longitude: 2,
      geoSource: 'geocode',
    });
  });

  it('geocodes duplicate unresolved rows only once', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1 }),
      makeRow({ id: 2 }),
    ]);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(1);
    expect(mocks.saveGeo).toHaveBeenCalledTimes(2);
    expect(result.attractions.map(a => a.geoSource)).toEqual([
      'geocode',
      'geocode',
    ]);
  });

  it('leaves a row unresolved when its inputs changed while the lookup ran', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([makeRow({ id: 1 })]);
    mocks.saveGeo.mockResolvedValue(false);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(result.attractions).toEqual([UNRESOLVED(1)]);
  });

  it('caps the billable geocoding calls per request', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue(
      Array.from({ length: MAX_GEOCODES_PER_REQUEST + 5 }, (_, i) =>
        makeRow({ id: i + 1, name: `Place ${i + 1}` }),
      ),
    );

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(MAX_GEOCODES_PER_REQUEST);
    expect(result.attractions.filter(a => a.geoSource === null)).toHaveLength(
      5,
    );
  });

  it('stops and reports exhaustion when the daily budget is spent', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1, name: 'A' }),
      makeRow({ id: 2, name: 'B' }),
    ]);
    mocks.tryConsume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(1);
    expect(result.geocodeExhausted).toBe(true);
    expect(result.attractions[1]).toEqual(UNRESOLVED(2));
  });

  it('marks the quota exhausted and stops when Google reports a quota error', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1, name: 'A' }),
      makeRow({ id: 2, name: 'B' }),
    ]);
    mocks.geocodeByName.mockRejectedValue(
      new MapsQuotaError('OVER_QUERY_LIMIT'),
    );

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(1);
    expect(mocks.markExhausted).toHaveBeenCalledWith('geocode');
    expect(mocks.saveGeo).not.toHaveBeenCalled();
    expect(result.geocodeExhausted).toBe(true);
  });

  it('logs and stops the batch on any other geocoding failure without flagging the quota', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1, name: 'A' }),
      makeRow({ id: 2, name: 'B' }),
    ]);
    mocks.geocodeByName.mockRejectedValue(new Error('REQUEST_DENIED'));

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).toHaveBeenCalledTimes(1);
    expect(mocks.markExhausted).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(result.geocodeExhausted).toBe(false);
  });

  it('reports exhaustion from the stored usage even when nothing was geocoded', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([makeResolvedRow({ id: 1 })]);
    mocks.getUsage.mockResolvedValue({
      used: 200,
      limit: 200,
      exhausted: true,
    });

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(result.geocodeExhausted).toBe(true);
  });

  it('skips geocoding entirely when no geocoding key is configured', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([makeRow({ id: 1 })]);
    mocks.isGeocodingEnabled.mockReturnValue(false);

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mocks.geocodeByName).not.toHaveBeenCalled();
    expect(mocks.getUsage).not.toHaveBeenCalled();
    expect(result.geocodeExhausted).toBe(false);
  });

  it('logs a failing link lookup and keeps resolving the other rows', async () => {
    mocks.findGeoRowsForTrip.mockResolvedValue([
      makeRow({ id: 1, google_map_url: 'https://bad' }),
      makeRow({ id: 2, name: 'Other', google_map_url: 'https://good' }),
    ]);
    mocks.isGeocodingEnabled.mockReturnValue(false);
    mocks.resolveCoordinatesFromLink.mockImplementation(
      async (link: string) => {
        if (link === 'https://bad') {
          throw new Error('boom');
        }
        return { lat: 9, lng: 8 };
      },
    );

    const result = await resolveTripGeo(TRIP_ID, DAY_1);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to resolve an attraction link',
      { id: 1 },
      expect.any(Error),
    );
    expect(result.attractions).toEqual([
      UNRESOLVED(1),
      { id: 2, latitude: 9, longitude: 8, geoSource: 'url' },
    ]);
  });
});
