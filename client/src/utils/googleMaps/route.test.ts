import { describe, expect, it, vi } from 'vitest';

import type { MapPoint } from './mapPoints';
import type { MapSession } from './mapSession';
import { applyRoute } from './route';
import type { PolylineOptions } from './types';

function makeSession() {
  const created: {
    options: PolylineOptions;
    setPath: ReturnType<typeof vi.fn>;
    setMap: ReturnType<typeof vi.fn>;
  }[] = [];
  class FakePolyline {
    setPath = vi.fn();
    setMap = vi.fn();
    constructor(public options: PolylineOptions) {
      created.push(this);
    }
  }
  const map = {};
  const session = {
    libs: { maps: { Polyline: FakePolyline } },
    map,
    route: null,
  } as unknown as MapSession;
  return { session, map, created };
}

function point(order: number, lat: number, dayId = 1): MapPoint {
  return {
    attractionId: order * 10 + dayId,
    dayId,
    order,
    name: `P${order}`,
    lat,
    lng: 100,
  };
}

describe('applyRoute', () => {
  it.each([
    { description: 'no points', points: [] as MapPoint[] },
    { description: 'a single point', points: [point(1, 1)] },
    {
      description: 'only other days having points',
      points: [point(1, 1, 2), point(2, 2, 2)],
    },
  ])('draws nothing for $description', ({ points }) => {
    const { session, created } = makeSession();

    applyRoute(session, points, 1);

    expect(created).toHaveLength(0);
    expect(session.route).toBeNull();
  });

  it.each([
    {
      description: 'sorts by itinerary order',
      points: [point(3, 3), point(1, 1), point(2, 2)],
      expected: [1, 2, 3],
    },
    {
      description: 'keeps a repeated coordinate so the day loops back',
      points: [point(1, 1), point(2, 2), point(4, 1)],
      expected: [1, 2, 1],
    },
    {
      description: 'skips missing stops and ignores other days',
      points: [point(1, 1), point(2, 9, 2), point(4, 4)],
      expected: [1, 4],
    },
  ])('$description', ({ points, expected }) => {
    const { session, created, map } = makeSession();

    applyRoute(session, points, 1);

    expect(created).toHaveLength(1);
    expect(created[0].options.path.map(p => p.lat)).toEqual(expected);
    expect(created[0].options.map).toBe(map);
    expect(session.route).toBe(created[0]);
  });

  it('draws a prominent line below the markers', () => {
    const { session, created } = makeSession();

    applyRoute(session, [point(1, 1), point(2, 2)], 1);

    expect(created[0].options.strokeWeight).toBeGreaterThanOrEqual(4);
    expect(created[0].options.zIndex).toBeLessThan(1);
  });

  it('updates the existing line in place when the day changes', () => {
    const { session, created } = makeSession();
    const points = [point(1, 1), point(2, 2), point(1, 5, 2), point(2, 6, 2)];

    applyRoute(session, points, 1);
    applyRoute(session, points, 2);

    expect(created).toHaveLength(1);
    expect(created[0].setPath).toHaveBeenCalledWith([
      { lat: 5, lng: 100 },
      { lat: 6, lng: 100 },
    ]);
  });

  it('removes the line when fewer than two points remain', () => {
    const { session, created } = makeSession();

    applyRoute(session, [point(1, 1), point(2, 2)], 1);
    applyRoute(session, [point(1, 1)], 1);

    expect(created[0].setMap).toHaveBeenCalledWith(null);
    expect(session.route).toBeNull();
  });
});
