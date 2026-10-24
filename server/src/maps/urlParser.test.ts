import { describe, expect, it } from 'vitest';

import { parseCoordinatesFromUrl } from './urlParser';

describe('parseCoordinatesFromUrl', () => {
  it.each([
    {
      description: 'the viewport center after @',
      url: 'https://www.google.com/maps/place/Taipei+101/@25.0339639,121.5644722,17z/data=!3m1!4b1',
      expected: { lat: 25.0339639, lng: 121.5644722 },
    },
    {
      description: 'negative coordinates after @',
      url: 'https://www.google.com/maps/@-33.8567844,151.213108,17z',
      expected: { lat: -33.8567844, lng: 151.213108 },
    },
    {
      description: 'the place pin in preference to the viewport center',
      url: 'https://www.google.com/maps/place/X/@25.0,121.0,17z/data=!4m6!3m5!1s0x0:0x0!8m2!3d25.0339!4d121.5645',
      expected: { lat: 25.0339, lng: 121.5645 },
    },
    {
      description: 'a percent-encoded place pin',
      url: 'https://www.google.com/maps/place/X/data=%213d25.5%214d121.5',
      expected: { lat: 25.5, lng: 121.5 },
    },
    {
      description: 'the q parameter',
      url: 'https://maps.google.com/?q=25.033,121.5654',
      expected: { lat: 25.033, lng: 121.5654 },
    },
    {
      description: 'an encoded comma in the q parameter',
      url: 'https://maps.google.com/?q=25.033%2C121.5654',
      expected: { lat: 25.033, lng: 121.5654 },
    },
    {
      description: 'the ll parameter',
      url: 'https://www.google.com/maps?ll=25.1,121.2',
      expected: { lat: 25.1, lng: 121.2 },
    },
    {
      description: 'the query parameter of a search URL',
      url: 'https://www.google.com/maps/search/?api=1&query=25.0,121.5',
      expected: { lat: 25.0, lng: 121.5 },
    },
    {
      description: 'a malformed percent sequence elsewhere in the URL',
      url: 'https://www.google.com/maps/@25.0,121.5,17z%E0%A4%A',
      expected: { lat: 25.0, lng: 121.5 },
    },
  ])('extracts $description', ({ url, expected }) => {
    expect(parseCoordinatesFromUrl(url)).toEqual(expected);
  });

  it.each([
    { description: 'an empty string', url: '' },
    { description: 'text that is not a URL', url: 'hello' },
    {
      description: 'a place name query',
      url: 'https://www.google.com/maps?q=Taipei+101',
    },
    {
      description: 'a link without coordinates',
      url: 'https://www.google.com/maps/place/Taipei+101',
    },
    {
      description: 'an out-of-range latitude',
      url: 'https://www.google.com/maps/@95.0,121.0,17z',
    },
    {
      description: 'an out-of-range longitude',
      url: 'https://www.google.com/maps/@25.0,181.0,17z',
    },
    {
      description: 'a q parameter that is not a coordinate pair',
      url: 'https://maps.google.com/?q=25.0,121.0,17',
    },
  ])('returns null for $description', ({ url }) => {
    expect(parseCoordinatesFromUrl(url)).toBeNull();
  });
});
