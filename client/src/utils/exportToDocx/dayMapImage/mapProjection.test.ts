import { describe, expect, it } from 'vitest';

import {
  MAP_PADDING_X,
  MAP_PADDING_Y,
  MAP_WIDTH,
  MAX_INNER_HEIGHT,
  MIN_INNER_HEIGHT,
  projectCoordinates,
} from './mapProjection';

const CENTER_X = MAP_WIDTH / 2;
const RIGHT_EDGE = MAP_WIDTH - MAP_PADDING_X;

describe('projectCoordinates', () => {
  it.each([
    {
      name: 'no coordinates',
      coordinates: [],
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [],
    },
    {
      name: 'a single coordinate, centered',
      coordinates: [{ lat: 35, lng: 139 }],
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [{ x: CENTER_X, y: MAP_PADDING_Y + MIN_INNER_HEIGHT / 2 }],
    },
    {
      name: 'identical coordinates, stacked on the center',
      coordinates: [
        { lat: 35, lng: 139 },
        { lat: 35, lng: 139 },
      ],
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [
        { x: CENTER_X, y: MAP_PADDING_Y + MIN_INNER_HEIGHT / 2 },
        { x: CENTER_X, y: MAP_PADDING_Y + MIN_INNER_HEIGHT / 2 },
      ],
    },
    {
      name: 'an east-west pair spanning the full width',
      coordinates: [
        { lat: 0, lng: 10 },
        { lat: 0, lng: 11 },
      ],
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [
        { x: MAP_PADDING_X, y: MAP_PADDING_Y + MIN_INNER_HEIGHT / 2 },
        { x: RIGHT_EDGE, y: MAP_PADDING_Y + MIN_INNER_HEIGHT / 2 },
      ],
    },
    {
      name: 'a north-south pair spanning the tallest area, north on top',
      coordinates: [
        { lat: 1, lng: 10 },
        { lat: 0, lng: 10 },
      ],
      height: MAX_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [
        { x: CENTER_X, y: MAP_PADDING_Y },
        { x: CENTER_X, y: MAP_PADDING_Y + MAX_INNER_HEIGHT },
      ],
    },
  ])('projects $name', ({ coordinates, height, points }) => {
    const projection = projectCoordinates(coordinates);

    expect(projection.width).toBe(MAP_WIDTH);
    expect(projection.height).toBeCloseTo(height);
    expect(projection.points).toHaveLength(points.length);
    projection.points.forEach((point, i) => {
      expect(point.x).toBeCloseTo(points[i].x);
      expect(point.y).toBeCloseTo(points[i].y);
    });
  });

  it('shrinks longitude by cos(latitude) so proportions stay true', () => {
    const { points } = projectCoordinates([
      { lat: 60, lng: 0 },
      { lat: 60, lng: 1 },
      { lat: 61, lng: 0 },
    ]);

    const horizontal = points[1].x - points[0].x;
    const vertical = points[0].y - points[2].y;
    expect(horizontal / vertical).toBeCloseTo(
      Math.cos((60.5 * Math.PI) / 180),
      3,
    );
  });

  it('keeps every point inside the padded marker area', () => {
    const { points, width, height } = projectCoordinates([
      { lat: 25.03, lng: 121.56 },
      { lat: 25.1, lng: 121.5 },
      { lat: 25.05, lng: 121.7 },
    ]);

    for (const { x, y } of points) {
      expect(x).toBeGreaterThanOrEqual(MAP_PADDING_X - 1e-6);
      expect(x).toBeLessThanOrEqual(width - MAP_PADDING_X + 1e-6);
      expect(y).toBeGreaterThanOrEqual(MAP_PADDING_Y - 1e-6);
      expect(y).toBeLessThanOrEqual(height - MAP_PADDING_Y + 1e-6);
    }
  });
});
