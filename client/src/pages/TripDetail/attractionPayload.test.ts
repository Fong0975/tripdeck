import { describe, expect, it } from 'vitest';

import { makeAttraction } from '@/test-utils/fixtures';

import { toAttractionPayload } from './attractionPayload';

const filled = makeAttraction({
  id: 5,
  name: 'Spot',
  googleMapUrl: 'https://maps.example/spot',
  notes: 'Notes',
  nearbyAttractions: 'Nearby',
  startTime: '09:00',
  endTime: '10:00',
  referenceWebsites: [{ title: 'Site', url: 'https://example.com' }],
  latitude: 1,
  longitude: 2,
});

describe('toAttractionPayload', () => {
  it.each([
    {
      description: 'fills unset optional fields with undefined',
      attraction: makeAttraction({ name: 'Spot' }),
      empty: undefined,
    },
    {
      description: 'fills unset optional fields with null',
      attraction: makeAttraction({ name: 'Spot' }),
      empty: null,
    },
    {
      description: 'replaces null optional fields with the empty value',
      attraction: makeAttraction({
        name: 'Spot',
        googleMapUrl: null,
        notes: null,
        nearbyAttractions: null,
        startTime: null,
        endTime: null,
      }),
      empty: undefined,
    },
  ])('$description', ({ attraction, empty }) => {
    expect(toAttractionPayload(attraction, empty)).toEqual({
      name: 'Spot',
      googleMapUrl: empty,
      notes: empty,
      nearbyAttractions: empty,
      startTime: empty,
      endTime: empty,
      referenceWebsites: undefined,
    });
  });

  it.each([{ empty: undefined }, { empty: null }])(
    'keeps set fields and drops non-payload fields (empty: $empty)',
    ({ empty }) => {
      expect(toAttractionPayload(filled, empty)).toStrictEqual({
        name: 'Spot',
        googleMapUrl: 'https://maps.example/spot',
        notes: 'Notes',
        nearbyAttractions: 'Nearby',
        startTime: '09:00',
        endTime: '10:00',
        referenceWebsites: [{ title: 'Site', url: 'https://example.com' }],
      });
    },
  );
});
