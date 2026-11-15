import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { computeGeoKey } from '../../maps/geoKey';
import { db } from '../../test-utils/dbMocks';
import { mockLogger } from '../../test-utils/loggerMock';

import { TripImportDataError } from './errors';
import {
  consistencyError,
  generateUniqueTripTitle,
  toGeoColumns,
} from './tripImportHelpers';

const mockPoolExecute = db.pool.execute;

describe('generateUniqueTripTitle', () => {
  it.each([
    {
      name: 'returns the title unchanged when no trip uses it',
      existing: ['Other Trip'],
      desired: 'Kyoto Trip',
      expected: 'Kyoto Trip',
    },
    {
      name: 'appends " (2)" when the title is already used',
      existing: ['Kyoto Trip'],
      desired: 'Kyoto Trip',
      expected: 'Kyoto Trip (2)',
    },
    {
      name: 'finds the next available suffix when earlier ones are taken',
      existing: ['Kyoto Trip', 'Kyoto Trip (2)'],
      desired: 'Kyoto Trip',
      expected: 'Kyoto Trip (3)',
    },
    {
      name: 'de-duplicates titles containing emoji/CJK characters correctly',
      existing: ['東京 🗼 五日遊'],
      desired: '東京 🗼 五日遊',
      expected: '東京 🗼 五日遊 (2)',
    },
  ])('$name', async ({ existing, desired, expected }) => {
    mockPoolExecute.mockResolvedValue([existing.map(title => ({ title }))]);

    await expect(generateUniqueTripTitle(desired)).resolves.toBe(expected);
  });
});

describe('toGeoColumns', () => {
  const key = computeGeoKey('Fushimi Inari', null);

  it.each([
    {
      description: 'keeps valid geocoded coordinates',
      geo: { latitude: 34.9671, longitude: 135.7727, geoSource: 'geocode' },
      expected: [34.9671, 135.7727, 'geocode', key],
    },
    {
      description: 'keeps valid url-derived coordinates',
      geo: { latitude: 35, longitude: 135, geoSource: 'url' },
      expected: [35, 135, 'url', key],
    },
    {
      description: 'keeps the not_found marker without coordinates',
      geo: { latitude: null, longitude: null, geoSource: 'not_found' },
      expected: [null, null, 'not_found', key],
    },
    {
      description: 'drops fields from an old backup that predates geo support',
      geo: {},
      expected: [null, null, null, null],
    },
    {
      description: 'drops a null geo source',
      geo: { latitude: null, longitude: null, geoSource: null },
      expected: [null, null, null, null],
    },
    {
      description: 'drops an unknown geo source',
      geo: { latitude: 35, longitude: 135, geoSource: 'manual' },
      expected: [null, null, null, null],
    },
    {
      description: 'drops out-of-range latitude',
      geo: { latitude: 91, longitude: 135, geoSource: 'geocode' },
      expected: [null, null, null, null],
    },
    {
      description: 'drops out-of-range longitude',
      geo: { latitude: 35, longitude: -181, geoSource: 'geocode' },
      expected: [null, null, null, null],
    },
    {
      description: 'drops non-numeric coordinates',
      geo: { latitude: '35', longitude: '135', geoSource: 'geocode' },
      expected: [null, null, null, null],
    },
    {
      description: 'drops NaN coordinates',
      geo: { latitude: NaN, longitude: 135, geoSource: 'geocode' },
      expected: [null, null, null, null],
    },
  ])('$description', ({ geo, expected }) => {
    const attraction = {
      name: 'Fushimi Inari',
      googleMapUrl: null,
      ...geo,
    } as Parameters<typeof toGeoColumns>[0];

    expect(toGeoColumns(attraction)).toEqual(expected);
  });
});

describe('consistencyError', () => {
  it('logs the inconsistency and returns a TripImportDataError', () => {
    const err = consistencyError(7, 'Day 3 is dangling');

    expect(err).toBeInstanceOf(TripImportDataError);
    expect(err.message).toBe('Day 3 is dangling');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Trip import consistency error',
      { originalTripId: 7, message: 'Day 3 is dangling' },
    );
  });
});
