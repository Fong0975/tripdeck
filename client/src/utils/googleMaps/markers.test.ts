import { describe, expect, it, vi } from 'vitest';

import type { MapPoint } from './mapPoints';
import type { MapSession } from './mapSession';
import { applyMarkers } from './markers';
import type { AdvancedMarkerOptions } from './types';

interface FakeMarker {
  options: AdvancedMarkerOptions;
  map: unknown;
}

function makeSession() {
  const created: FakeMarker[] = [];
  class FakeAdvancedMarker implements FakeMarker {
    map: unknown;
    constructor(public options: AdvancedMarkerOptions) {
      this.map = options.map;
      created.push(this);
    }
  }
  const map = { fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn() };
  const session = {
    libs: {
      maps: { Map: vi.fn() },
      marker: { AdvancedMarkerElement: FakeAdvancedMarker },
    },
    map,
    container: document.createElement('div'),
    markers: new Map(),
  } as unknown as MapSession;
  return { session, map, created };
}

function point(overrides: Partial<MapPoint> = {}): MapPoint {
  return {
    attractionId: 1,
    dayId: 1,
    order: 1,
    name: 'Museum',
    lat: 25,
    lng: 121,
    ...overrides,
  };
}

describe('applyMarkers', () => {
  it('draws the selected day as numbered coloured pins above grey dots for other days', () => {
    const { session, created } = makeSession();

    applyMarkers(
      session,
      [
        point({ attractionId: 1, dayId: 1, order: 2, name: 'Today' }),
        point({
          attractionId: 2,
          dayId: 2,
          order: 1,
          name: 'Other',
          lat: 26,
        }),
      ],
      1,
    );

    const [active, inactive] = created;
    expect(active.options).toMatchObject({
      title: 'Today',
      zIndex: 2,
      position: { lat: 25, lng: 121 },
    });
    expect(active.options.content).toHaveTextContent('2');
    expect(active.options.content).toHaveClass('bg-primary');
    expect(inactive.options).toMatchObject({ title: 'Other', zIndex: 1 });
    expect(inactive.options.content).toBeEmptyDOMElement();
    expect(inactive.options.content).toHaveClass('bg-gray-600');
  });

  it('fits the view to the selected day only', () => {
    const { session, map } = makeSession();

    applyMarkers(
      session,
      [
        point({ attractionId: 1, dayId: 1, lat: 1, lng: 2 }),
        point({ attractionId: 2, dayId: 1, lat: 3, lng: 4 }),
        point({ attractionId: 3, dayId: 2, lat: 50, lng: 60 }),
      ],
      1,
    );

    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    const [bounds, padding] = map.fitBounds.mock.calls[0];
    expect(bounds).toEqual({ north: 3, south: 1, east: 4, west: 2 });
    expect(padding).toBe(64);
  });

  it('centres and zooms in on a lone selected-day point instead of fitting bounds', () => {
    const { session, map } = makeSession();

    applyMarkers(session, [point({ lat: 10, lng: 20 })], 1);

    expect(map.setCenter).toHaveBeenCalledWith({ lat: 10, lng: 20 });
    expect(map.setZoom).toHaveBeenCalledWith(15);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('fits every point when the selected day has none', () => {
    const { session, map } = makeSession();

    applyMarkers(
      session,
      [
        point({ attractionId: 1, dayId: 2, lat: 1, lng: 2 }),
        point({ attractionId: 2, dayId: 3, lat: 3, lng: 4 }),
      ],
      1,
    );

    expect(map.fitBounds.mock.calls[0][0]).toEqual({
      north: 3,
      south: 1,
      east: 4,
      west: 2,
    });
  });

  it('leaves the view alone when there is nothing to show', () => {
    const { session, map } = makeSession();

    applyMarkers(session, [], 1);

    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setCenter).not.toHaveBeenCalled();
  });

  it('does not rebuild markers that did not change', () => {
    const { session, created } = makeSession();
    const points = [
      point({ attractionId: 1 }),
      point({ attractionId: 2, lat: 26 }),
    ];

    applyMarkers(session, points, 1);
    applyMarkers(session, points, 1);

    expect(created).toHaveLength(2);
  });

  it('restyles a marker when its day gains or loses the selection', () => {
    const { session, created } = makeSession();
    const points = [
      point({ attractionId: 1, dayId: 1 }),
      point({ attractionId: 2, dayId: 2, lat: 26 }),
    ];

    applyMarkers(session, points, 1);
    applyMarkers(session, points, 2);

    expect(created).toHaveLength(4);
    expect(created[0].map).toBeNull();
    expect(created[1].map).toBeNull();
    expect(created[2].options.content).toHaveClass('bg-gray-600');
    expect(created[3].options.content).toHaveClass('bg-primary');
  });

  it('rebuilds a marker whose position changed', () => {
    const { session, created } = makeSession();

    applyMarkers(session, [point({ lat: 1 })], 1);
    applyMarkers(session, [point({ lat: 2 })], 1);

    expect(created).toHaveLength(2);
    expect(created[0].map).toBeNull();
    expect(created[1].options.position).toEqual({ lat: 2, lng: 121 });
  });

  it('removes markers for attractions that are no longer on the map', () => {
    const { session, created } = makeSession();
    const stay = point({ attractionId: 2, lat: 26 });

    applyMarkers(session, [point({ attractionId: 1 }), stay], 1);
    applyMarkers(session, [stay], 1);

    expect(created[0].map).toBeNull();
    expect(created[1].map).not.toBeNull();
    expect([...session.markers.keys()]).toEqual(['26,121']);
  });

  it('draws attractions sharing a coordinate as one marker labelled with every position', () => {
    const { session, created } = makeSession();

    applyMarkers(
      session,
      [
        point({ attractionId: 1, order: 1, name: 'Hotel' }),
        point({ attractionId: 2, order: 2, name: 'Museum', lat: 26 }),
        point({ attractionId: 3, order: 3, name: 'Hotel' }),
      ],
      1,
    );

    expect(created).toHaveLength(2);
    expect(created[0].options.content).toHaveTextContent('1·3');
    expect(created[0].options.title).toBe('Hotel');
  });

  it('lists distinct names in the title when shared-coordinate stops differ', () => {
    const { session, created } = makeSession();

    applyMarkers(
      session,
      [
        point({ attractionId: 1, order: 1, name: 'Hotel' }),
        point({ attractionId: 2, order: 2, name: 'Lobby bar' }),
      ],
      1,
    );

    expect(created[0].options.title).toBe('Hotel / Lobby bar');
  });

  it('rebuilds a merged marker when a duplicate is removed', () => {
    const { session, created } = makeSession();
    const first = point({ attractionId: 1, order: 1 });

    applyMarkers(session, [first, point({ attractionId: 2, order: 4 })], 1);
    applyMarkers(session, [first], 1);

    expect(created).toHaveLength(2);
    expect(created[0].map).toBeNull();
    expect(created[1].options.content).toHaveTextContent(/^1$/);
  });
});
