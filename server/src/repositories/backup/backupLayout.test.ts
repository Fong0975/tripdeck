import { describe, expect, it } from 'vitest';

import { makeTripBackupData } from '../../test-utils/fixtures';
import type { DayResponse, ImageResponse } from '../../types/trip';

import { collectTripImages, tripDataPath, tripImagePath } from './backupLayout';

function image(id: number): ImageResponse {
  return { id, filename: `img${id}.jpg`, title: `t${id}` };
}

function day(
  id: number,
  images: ImageResponse[],
  attractionImages: ImageResponse[][],
  connectionImages: ImageResponse[][],
): DayResponse {
  return {
    id,
    day: id,
    date: '2024-05-10',
    notes: null,
    locations: [],
    attractions: attractionImages.map((imgs, i) => ({
      id: id * 100 + i,
      name: `A${i}`,
      googleMapUrl: null,
      notes: null,
      nearbyAttractions: null,
      startTime: null,
      endTime: null,
      referenceWebsites: [],
      images: imgs,
      sortOrder: i,
      latitude: null,
      longitude: null,
      geoSource: null,
    })),
    connections: connectionImages.map((imgs, i) => ({
      id: id * 1000 + i,
      fromAttractionId: id * 100,
      toAttractionId: id * 100 + 1,
      transportMode: null,
      duration: null,
      route: null,
      notes: null,
      images: imgs,
    })),
    images,
  };
}

describe('backupLayout', () => {
  it.each([
    { folder: 'trip_12', expected: 'trips/trip_12/data.json' },
    { folder: 'trip_1', expected: 'trips/trip_1/data.json' },
  ])('tripDataPath($folder) is $expected', ({ folder, expected }) => {
    expect(tripDataPath(folder)).toBe(expected);
  });

  it.each([
    {
      folder: 'trip_12',
      filename: 'abc.jpg',
      expected: 'trips/trip_12/images/abc.jpg',
    },
    {
      folder: 'trip_3',
      filename: 'x-y.png',
      expected: 'trips/trip_3/images/x-y.png',
    },
  ])(
    'tripImagePath($folder, $filename) is $expected',
    ({ folder, filename, expected }) => {
      expect(tripImagePath(folder, filename)).toBe(expected);
    },
  );

  describe('collectTripImages', () => {
    it.each([
      {
        name: 'returns nothing for a trip without images',
        tripImages: [] as ImageResponse[],
        days: [] as DayResponse[],
        expectedIds: [] as number[],
      },
      {
        name: 'returns trip images when there are no days',
        tripImages: [image(1)],
        days: [],
        expectedIds: [1],
      },
      {
        name: 'orders trip, then per day: day, attraction, connection images',
        tripImages: [image(1)],
        days: [
          day(1, [image(2)], [[image(3)], [image(4)]], [[image(5)]]),
          day(2, [], [[]], [[image(6)]]),
        ],
        expectedIds: [1, 2, 3, 4, 5, 6],
      },
    ])('$name', ({ tripImages, days, expectedIds }) => {
      const data = makeTripBackupData({
        trip: { images: tripImages },
        content: { tripId: 1, days },
      });

      expect(collectTripImages(data).map(i => i.id)).toEqual(expectedIds);
    });
  });
});
