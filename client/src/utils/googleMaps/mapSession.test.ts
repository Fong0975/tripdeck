import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadGoogleMaps } from './loader';
import {
  __resetMapSessionForTests,
  attachMapSession,
  detachMapSession,
} from './mapSession';

vi.mock('./loader', () => ({ loadGoogleMaps: vi.fn() }));

const mapConstructed = vi.fn();

class FakeMap {
  constructor(element: HTMLElement, options: unknown) {
    mapConstructed(element, options);
  }
}

const libs = {
  maps: { Map: FakeMap },
  marker: { AdvancedMarkerElement: vi.fn() },
};

beforeEach(() => {
  __resetMapSessionForTests();
  vi.mocked(loadGoogleMaps).mockResolvedValue(libs as never);
});

describe('attachMapSession', () => {
  it('creates the map inside the host with the demo map id and no extra controls', async () => {
    const host = document.createElement('div');

    const session = await attachMapSession(host);

    expect(host.contains(session.container)).toBe(true);
    expect(mapConstructed).toHaveBeenCalledTimes(1);
    expect(mapConstructed).toHaveBeenCalledWith(
      session.container,
      expect.objectContaining({
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }),
    );
    expect(session.markers.size).toBe(0);
    expect(session.route).toBeNull();
  });

  it('softens only the base map canvas so the markers stay at full strength', async () => {
    const { container } = await attachMapSession(document.createElement('div'));

    expect(container).toHaveClass(
      '[&_canvas]:saturate-70',
      '[&_canvas]:brightness-110',
      '[&_canvas]:contrast-90',
    );
  });

  it('moves the existing map into a new host instead of creating another', async () => {
    const firstHost = document.createElement('div');
    const secondHost = document.createElement('div');
    const first = await attachMapSession(firstHost);

    const second = await attachMapSession(secondHost);

    expect(second).toBe(first);
    expect(secondHost.contains(first.container)).toBe(true);
    expect(firstHost.contains(first.container)).toBe(false);
    expect(mapConstructed).toHaveBeenCalledTimes(1);
  });

  it('creates a single map for concurrent attaches', async () => {
    const [first, second] = await Promise.all([
      attachMapSession(document.createElement('div')),
      attachMapSession(document.createElement('div')),
    ]);

    expect(second).toBe(first);
    expect(mapConstructed).toHaveBeenCalledTimes(1);
  });

  it('allows a retry after the libraries failed to load', async () => {
    vi.mocked(loadGoogleMaps).mockRejectedValueOnce(new Error('offline'));
    const host = document.createElement('div');

    await expect(attachMapSession(host)).rejects.toThrow('offline');
    const session = await attachMapSession(host);

    expect(host.contains(session.container)).toBe(true);
  });
});

describe('detachMapSession', () => {
  it('removes the map from the page but keeps it for the next attach', async () => {
    const host = document.createElement('div');
    const session = await attachMapSession(host);

    detachMapSession();
    await vi.waitFor(() =>
      expect(host.contains(session.container)).toBe(false),
    );

    const again = await attachMapSession(host);
    expect(again).toBe(session);
    expect(host.contains(session.container)).toBe(true);
    expect(mapConstructed).toHaveBeenCalledTimes(1);
  });

  it('does nothing before any map exists', () => {
    expect(() => detachMapSession()).not.toThrow();
  });

  it('ignores a session that failed to be created', async () => {
    vi.mocked(loadGoogleMaps).mockRejectedValueOnce(new Error('offline'));
    const attempt = attachMapSession(document.createElement('div'));
    detachMapSession();

    await expect(attempt).rejects.toThrow('offline');
  });
});
