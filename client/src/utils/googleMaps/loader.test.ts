import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMapsConfig, MapsQuotaError, reportMapsError } from '@/api/maps';
import { markMapsExhausted } from '@/utils/mapsApi';

import {
  __resetGoogleMapsLoaderForTests,
  loadGoogleMaps,
  subscribeMapsAuthFailure,
} from './loader';
import type { GoogleWindow } from './types';

vi.mock('@/api/maps', async importOriginal => ({
  ...(await importOriginal<typeof import('@/api/maps')>()),
  getMapsConfig: vi.fn(),
  reportMapsError: vi.fn(),
}));
vi.mock('@/utils/mapsApi', () => ({ markMapsExhausted: vi.fn() }));

const mapsLibrary = { Map: vi.fn(), LatLngBounds: vi.fn() };
const markerLibrary = { AdvancedMarkerElement: vi.fn() };
const importLibrary = vi.fn(async (name: string) =>
  name === 'maps' ? mapsLibrary : markerLibrary,
);
const googleWindow = window as GoogleWindow;

/** Stands in for `document.head.appendChild` so no script is really loaded. */
const appended = vi.fn((node: Node) => node);

/** Starts a load and waits until the script tag has been added. */
async function startLoad() {
  const promise = loadGoogleMaps();
  await vi.waitFor(() => expect(appended).toHaveBeenCalled());
  const script = appended.mock.calls[0][0] as HTMLScriptElement;
  return { promise, script };
}

function exposeGoogleApi() {
  googleWindow.google = { maps: { importLibrary } as never };
}

beforeEach(() => {
  __resetGoogleMapsLoaderForTests();
  delete googleWindow.google;
  delete googleWindow.gm_authFailure;
  vi.spyOn(document.head, 'appendChild').mockImplementation(appended as never);
  vi.mocked(getMapsConfig).mockResolvedValue({ apiKey: 'browser-key' });
  vi.mocked(reportMapsError).mockResolvedValue(undefined);
});

describe('loadGoogleMaps', () => {
  it('fetches the key, injects the script and resolves with the maps and marker libraries', async () => {
    const { promise, script } = await startLoad();
    exposeGoogleApi();
    script.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toEqual({
      maps: mapsLibrary,
      marker: markerLibrary,
    });

    const src = new URL(script.src);
    expect(src.origin + src.pathname).toBe(
      'https://maps.googleapis.com/maps/api/js',
    );
    expect(src.searchParams.get('key')).toBe('browser-key');
    expect(src.searchParams.get('loading')).toBe('async');
    expect(script.async).toBe(true);
    expect(googleWindow.gm_authFailure).toBeTypeOf('function');
  });

  it('shares one key request and one script across callers', async () => {
    const first = await startLoad();
    exposeGoogleApi();
    const second = loadGoogleMaps();
    first.script.dispatchEvent(new Event('load'));
    await first.promise;
    await loadGoogleMaps();

    expect(await second).toBe(await first.promise);
    expect(getMapsConfig).toHaveBeenCalledTimes(1);
    expect(appended).toHaveBeenCalledTimes(1);
  });

  it('marks the quota exhausted and never retries after a quota refusal', async () => {
    vi.mocked(getMapsConfig).mockRejectedValue(
      new MapsQuotaError('reset-time'),
    );

    await expect(loadGoogleMaps()).rejects.toBeInstanceOf(MapsQuotaError);
    await expect(loadGoogleMaps()).rejects.toBeInstanceOf(MapsQuotaError);

    expect(markMapsExhausted).toHaveBeenCalledWith('reset-time');
    expect(getMapsConfig).toHaveBeenCalledTimes(1);
    expect(appended).not.toHaveBeenCalled();
  });

  it('retries on the next call after any other key request failure', async () => {
    vi.mocked(getMapsConfig).mockRejectedValueOnce(new Error('API error 500'));

    await expect(loadGoogleMaps()).rejects.toThrow('API error 500');
    const { promise, script } = await startLoad();
    exposeGoogleApi();
    script.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toBeDefined();
    expect(getMapsConfig).toHaveBeenCalledTimes(2);
    expect(markMapsExhausted).not.toHaveBeenCalled();
  });

  it('rejects when the script fails to load, then allows a retry', async () => {
    const { promise, script } = await startLoad();
    script.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow(
      'Failed to load the Google Maps script',
    );

    appended.mockClear();
    const retry = await startLoad();
    exposeGoogleApi();
    retry.script.dispatchEvent(new Event('load'));
    await expect(retry.promise).resolves.toBeDefined();
  });

  it('rejects when the script loads without exposing the API', async () => {
    const { promise, script } = await startLoad();
    script.dispatchEvent(new Event('load'));

    await expect(promise).rejects.toThrow('did not initialise');
  });
});

describe('Google auth failure handling', () => {
  async function installHandler() {
    await startLoad();
    return googleWindow.gm_authFailure as () => void;
  }

  it('pauses map loads locally and on the backend, then notifies subscribers', async () => {
    const listener = vi.fn();
    subscribeMapsAuthFailure(listener);
    const authFailure = await installHandler();

    authFailure();

    expect(markMapsExhausted).toHaveBeenCalledWith(null);
    expect(reportMapsError).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a subscriber that unsubscribed', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMapsAuthFailure(listener);
    const authFailure = await installHandler();

    unsubscribe();
    authFailure();

    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores a failed backend report', async () => {
    vi.mocked(reportMapsError).mockRejectedValue(new Error('offline'));
    const listener = vi.fn();
    subscribeMapsAuthFailure(listener);
    const authFailure = await installHandler();

    expect(() => authFailure()).not.toThrow();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
