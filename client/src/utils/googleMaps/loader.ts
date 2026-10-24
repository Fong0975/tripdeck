import { getMapsConfig, MapsQuotaError, reportMapsError } from '@/api/maps';
import { markMapsExhausted } from '@/utils/mapsApi';

import type { GoogleWindow, MapLibraries } from './types';

const SCRIPT_URL = 'https://maps.googleapis.com/maps/api/js';

let librariesPromise: Promise<MapLibraries> | null = null;
const authFailureListeners = new Set<() => void>();

/**
 * Calls `listener` when Google reports (via `gm_authFailure`) that it
 * rejected the key, e.g. an invalid key, a referrer mismatch or an exceeded
 * quota. Returns an unsubscribe function.
 */
export function subscribeMapsAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function handleAuthFailure(): void {
  markMapsExhausted(null);
  void reportMapsError().catch(() => undefined);
  authFailureListeners.forEach(listener => listener());
}

function injectScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    (window as GoogleWindow).gm_authFailure = handleAuthFailure;

    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?${new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      loading: 'async',
      language: 'zh-TW',
    }).toString()}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load the Google Maps script'));
    };
    document.head.appendChild(script);
  });
}

async function loadLibraries(): Promise<MapLibraries> {
  let apiKey: string;
  try {
    ({ apiKey } = await getMapsConfig());
  } catch (err) {
    if (err instanceof MapsQuotaError) {
      markMapsExhausted(err.resetAt);
    }
    throw err;
  }

  await injectScript(apiKey);

  const maps = (window as GoogleWindow).google?.maps;
  if (!maps) {
    throw new Error('The Google Maps API did not initialise');
  }
  const [mapsLibrary, markerLibrary] = await Promise.all([
    maps.importLibrary('maps'),
    maps.importLibrary('marker'),
  ]);
  return { maps: mapsLibrary, marker: markerLibrary };
}

/**
 * Loads the Google Maps JavaScript API once per page session. The key request
 * (which counts one map load on the backend) and the script injection are
 * shared by every caller. A failure is retried on the next call, except a
 * quota refusal, which stays final until the page is reloaded so a spent
 * quota is never hammered.
 */
export function loadGoogleMaps(): Promise<MapLibraries> {
  librariesPromise ??= loadLibraries().catch((err: unknown) => {
    if (!(err instanceof MapsQuotaError)) {
      librariesPromise = null;
    }
    throw err;
  });
  return librariesPromise;
}

/** Test-only: forgets the loaded libraries and auth failure subscribers. */
export function __resetGoogleMapsLoaderForTests(): void {
  librariesPromise = null;
  authFailureListeners.clear();
}
