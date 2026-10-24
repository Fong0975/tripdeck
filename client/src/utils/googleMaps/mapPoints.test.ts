import { describe, expect, it } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { buildMapPoints, hasCoordinates } from './mapPoints';

describe('hasCoordinates', () => {
  it.each([
    { description: 'both numbers', lat: 25, lng: 121, expected: true },
    { description: 'zero values', lat: 0, lng: 0, expected: true },
    { description: 'null latitude', lat: null, lng: 121, expected: false },
    { description: 'null longitude', lat: 25, lng: null, expected: false },
    {
      description: 'both missing',
      lat: undefined,
      lng: undefined,
      expected: false,
    },
  ])('returns $expected for $description', ({ lat, lng, expected }) => {
    expect(hasCoordinates({ latitude: lat, longitude: lng })).toBe(expected);
  });
});

describe('buildMapPoints', () => {
  it('returns nothing for days without located attractions', () => {
    const days = [
      makeDay({ attractions: [makeAttraction({ id: 1 })] }),
      makeDay({ id: 2 }),
    ];

    expect(buildMapPoints(days)).toEqual([]);
  });

  it('keeps itinerary order across days and numbers within each day', () => {
    const days = [
      makeDay({
        id: 1,
        attractions: [
          makeAttraction({ id: 10, name: 'A', latitude: 1, longitude: 2 }),
          makeAttraction({ id: 11, name: 'B', latitude: 3, longitude: 4 }),
        ],
      }),
      makeDay({
        id: 2,
        attractions: [
          makeAttraction({ id: 20, name: 'C', latitude: 5, longitude: 6 }),
        ],
      }),
    ];

    expect(buildMapPoints(days)).toEqual([
      { attractionId: 10, dayId: 1, order: 1, name: 'A', lat: 1, lng: 2 },
      { attractionId: 11, dayId: 1, order: 2, name: 'B', lat: 3, lng: 4 },
      { attractionId: 20, dayId: 2, order: 1, name: 'C', lat: 5, lng: 6 },
    ]);
  });

  it('skips unlocated attractions without renumbering the rest', () => {
    const days = [
      makeDay({
        id: 1,
        attractions: [
          makeAttraction({ id: 10, name: 'A', latitude: 1, longitude: 2 }),
          makeAttraction({ id: 11, name: 'Missing' }),
          makeAttraction({
            id: 12,
            name: 'Not found',
            latitude: null,
            longitude: null,
            geoSource: 'not_found',
          }),
          makeAttraction({ id: 13, name: 'D', latitude: 7, longitude: 8 }),
        ],
      }),
    ];

    expect(buildMapPoints(days).map(p => [p.attractionId, p.order])).toEqual([
      [10, 1],
      [13, 4],
    ]);
  });

  it('keeps zero coordinates', () => {
    const days = [
      makeDay({
        attractions: [makeAttraction({ id: 1, latitude: 0, longitude: 0 })],
      }),
    ];

    expect(buildMapPoints(days)).toHaveLength(1);
  });
});
