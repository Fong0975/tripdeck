import { describe, expect, it } from 'vitest';

import { overlapArea, placeLabels, type Rect } from './labelLayout';

const SURFACE = { width: 300, height: 200 };

describe('overlapArea', () => {
  it.each([
    {
      name: 'overlapping rectangles',
      a: { x: 0, y: 0, width: 10, height: 10 },
      b: { x: 5, y: 5, width: 10, height: 10 },
      expected: 25,
    },
    {
      name: 'a rectangle inside another',
      a: { x: 0, y: 0, width: 20, height: 20 },
      b: { x: 5, y: 5, width: 4, height: 4 },
      expected: 16,
    },
    {
      name: 'rectangles that only touch',
      a: { x: 0, y: 0, width: 10, height: 10 },
      b: { x: 10, y: 0, width: 10, height: 10 },
      expected: 0,
    },
    {
      name: 'separate rectangles',
      a: { x: 0, y: 0, width: 10, height: 10 },
      b: { x: 50, y: 50, width: 10, height: 10 },
      expected: 0,
    },
  ])('returns $expected for $name', ({ a, b, expected }) => {
    expect(overlapArea(a, b)).toBe(expected);
    expect(overlapArea(b, a)).toBe(expected);
  });
});

describe('placeLabels', () => {
  const label = { markerIndex: 0, width: 40, height: 20 };

  it.each([
    {
      name: 'to the right when there is room',
      marker: { x: 100, y: 100, radius: 10 },
      surface: SURFACE,
      expected: { x: 114, y: 90, width: 40, height: 20 },
    },
    {
      name: 'to the left when the right side leaves the surface',
      marker: { x: 290, y: 100, radius: 10 },
      surface: SURFACE,
      expected: { x: 236, y: 90, width: 40, height: 20 },
    },
    {
      name: 'above when both sides leave the surface',
      marker: { x: 25, y: 100, radius: 10 },
      surface: { width: 50, height: 200 },
      expected: { x: 5, y: 66, width: 40, height: 20 },
    },
  ])('places a label $name', ({ marker, surface, expected }) => {
    expect(placeLabels([marker], [label], surface)).toEqual([expected]);
  });

  it('moves a label to the next side when an earlier label is in the way', () => {
    const markers = [
      { x: 100, y: 100, radius: 10 },
      { x: 100, y: 100, radius: 10 },
    ];

    const [first, second] = placeLabels(
      markers,
      [label, { ...label, markerIndex: 1 }],
      SURFACE,
    );

    expect(first).toEqual({ x: 114, y: 90, width: 40, height: 20 });
    expect(second).toEqual({ x: 46, y: 90, width: 40, height: 20 });
  });

  it('keeps labels off other markers', () => {
    const markers = [
      { x: 100, y: 100, radius: 10 },
      { x: 130, y: 100, radius: 10 },
    ];

    const [first] = placeLabels(markers, [label], SURFACE);

    const blocker: Rect = { x: 120, y: 90, width: 20, height: 20 };
    expect(overlapArea(first, blocker)).toBe(0);
  });

  it('clamps a label that cannot fit anywhere into the surface', () => {
    const [rect] = placeLabels(
      [{ x: 25, y: 15, radius: 10 }],
      [{ markerIndex: 0, width: 60, height: 20 }],
      { width: 50, height: 30 },
    );

    expect(rect.x).toBe(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(30);
  });

  it('returns nothing when there are no labels', () => {
    expect(placeLabels([{ x: 1, y: 1, radius: 5 }], [], SURFACE)).toEqual([]);
  });
});
