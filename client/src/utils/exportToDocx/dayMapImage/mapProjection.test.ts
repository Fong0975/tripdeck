import { describe, expect, it } from 'vitest';

import {
  MAP_PADDING_X,
  MAP_PADDING_Y,
  MAP_WIDTH,
  MAX_INNER_HEIGHT,
  MAX_ZOOM,
  MIN_INNER_HEIGHT,
  MIN_ZOOM,
  SINGLE_POINT_ZOOM,
  TILE_SIZE,
  latToWorldY,
  lngToWorldX,
  projectCoordinates,
} from './mapProjection';

const INNER_WIDTH = MAP_WIDTH - MAP_PADDING_X * 2;

describe('lngToWorldX / latToWorldY', () => {
  it.each([
    { name: 'the west edge', lng: -180, zoom: 3, expected: 0 },
    { name: 'the prime meridian', lng: 0, zoom: 3, expected: 4 * TILE_SIZE },
    { name: 'the east edge', lng: 180, zoom: 3, expected: 8 * TILE_SIZE },
  ])('maps $name to world x $expected', ({ lng, zoom, expected }) => {
    expect(lngToWorldX(lng, zoom)).toBeCloseTo(expected);
  });

  it.each([
    { name: 'the equator', lat: 0, zoom: 3, expected: 4 * TILE_SIZE },
    { name: 'the northern limit', lat: 85.0511287798, zoom: 3, expected: 0 },
    {
      name: 'the southern limit',
      lat: -85.0511287798,
      zoom: 3,
      expected: 8 * TILE_SIZE,
    },
    { name: 'a pole, clamped to the limit', lat: 90, zoom: 3, expected: 0 },
  ])('maps $name to world y $expected', ({ lat, zoom, expected }) => {
    expect(latToWorldY(lat, zoom)).toBeCloseTo(expected, 3);
  });
});

describe('projectCoordinates', () => {
  it('returns an empty projection for no coordinates', () => {
    expect(projectCoordinates([])).toMatchObject({
      width: MAP_WIDTH,
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      zoom: SINGLE_POINT_ZOOM,
      points: [],
    });
  });

  it.each([
    { name: 'a single coordinate', coordinates: [{ lat: 35, lng: 139 }] },
    {
      name: 'identical coordinates',
      coordinates: [
        { lat: 35, lng: 139 },
        { lat: 35, lng: 139 },
      ],
    },
  ])('centers $name at street level', ({ coordinates }) => {
    const projection = projectCoordinates(coordinates);

    expect(projection.zoom).toBe(SINGLE_POINT_ZOOM);
    expect(projection.height).toBeCloseTo(MIN_INNER_HEIGHT + MAP_PADDING_Y * 2);
    for (const point of projection.points) {
      expect(point.x).toBeCloseTo(projection.width / 2);
      expect(point.y).toBeCloseTo(projection.height / 2);
    }
  });

  it('anchors the view origin so points sit at their world pixels', () => {
    const [coordinate] = [{ lat: 25.03, lng: 121.56 }];

    const projection = projectCoordinates([coordinate]);

    expect(projection.originX + projection.points[0].x).toBeCloseTo(
      lngToWorldX(coordinate.lng, projection.zoom),
    );
    expect(projection.originY + projection.points[0].y).toBeCloseTo(
      latToWorldY(coordinate.lat, projection.zoom),
    );
  });

  it.each([
    {
      name: 'a short walk in one city',
      coordinates: [
        { lat: 25.03, lng: 121.56 },
        { lat: 25.05, lng: 121.5 },
        { lat: 25.04, lng: 121.53 },
      ],
    },
    {
      name: 'a trip across a country',
      coordinates: [
        { lat: 35.0, lng: 135.0 },
        { lat: 43.0, lng: 141.0 },
      ],
    },
    {
      name: 'a north-south pair',
      coordinates: [
        { lat: 25.1, lng: 121.5 },
        { lat: 25.0, lng: 121.5 },
      ],
    },
    {
      name: 'an east-west pair',
      coordinates: [
        { lat: 25.0, lng: 121.5 },
        { lat: 25.0, lng: 121.6 },
      ],
    },
    {
      name: 'points in the southern hemisphere',
      coordinates: [
        { lat: -33.9, lng: 151.2 },
        { lat: -37.8, lng: 145.0 },
      ],
    },
  ])(
    'fits $name at the highest zoom that keeps markers in the padded area',
    ({ coordinates }) => {
      const { points, width, height, zoom } = projectCoordinates(coordinates);
      const innerHeight = height - MAP_PADDING_Y * 2;

      expect(Number.isInteger(zoom)).toBe(true);
      expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
      for (const { x, y } of points) {
        expect(x).toBeGreaterThanOrEqual(MAP_PADDING_X - 1e-6);
        expect(x).toBeLessThanOrEqual(width - MAP_PADDING_X + 1e-6);
        expect(y).toBeGreaterThanOrEqual(MAP_PADDING_Y - 1e-6);
        expect(y).toBeLessThanOrEqual(height - MAP_PADDING_Y + 1e-6);
      }

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const rangeX = Math.max(...xs) - Math.min(...xs);
      const rangeY = Math.max(...ys) - Math.min(...ys);
      const atLimit = zoom === MAX_ZOOM || zoom === MIN_ZOOM;
      // One more zoom level would double the range and overflow the area.
      expect(
        atLimit || rangeX * 2 > INNER_WIDTH || rangeY * 2 > innerHeight,
      ).toBe(true);
    },
  );

  it.each([
    {
      name: 'an east-west pair gets the shortest area',
      coordinates: [
        { lat: 25, lng: 121.5 },
        { lat: 25, lng: 121.6 },
      ],
      innerHeight: MIN_INNER_HEIGHT,
    },
    {
      name: 'a north-south pair gets the tallest area',
      coordinates: [
        { lat: 25.1, lng: 121.5 },
        { lat: 25, lng: 121.5 },
      ],
      innerHeight: MAX_INNER_HEIGHT,
    },
  ])(
    'sizes the marker area by aspect ratio: $name',
    ({ coordinates, innerHeight }) => {
      expect(projectCoordinates(coordinates).height).toBeCloseTo(
        innerHeight + MAP_PADDING_Y * 2,
      );
    },
  );

  it('stretches latitude like Web Mercator so tiles line up', () => {
    const { points } = projectCoordinates([
      { lat: 60, lng: 0 },
      { lat: 60, lng: 1 },
      { lat: 61, lng: 0 },
    ]);

    const horizontal = points[1].x - points[0].x;
    const vertical = points[0].y - points[2].y;
    expect(vertical / horizontal).toBeCloseTo(
      1 / Math.cos((60.5 * Math.PI) / 180),
      1,
    );
  });

  it('puts north above and east to the right of the origin point', () => {
    const [origin, north, east] = projectCoordinates([
      { lat: 25, lng: 121 },
      { lat: 25.01, lng: 121 },
      { lat: 25, lng: 121.01 },
    ]).points;

    expect(north.y).toBeLessThan(origin.y);
    expect(east.x).toBeGreaterThan(origin.x);
  });
});
