import { createLogger } from '../logger';

import type { Coordinates } from './urlParser';

const logger = createLogger('maps');

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const GEOCODE_TIMEOUT_MS = 8_000;

/** Google reported that the daily or per-second quota has been used up. */
export class MapsQuotaError extends Error {}

/** Google rejected the request, usually a misconfigured or restricted key. */
export class MapsRequestDeniedError extends Error {}

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
}

/**
 * Looks a place name up with the Google Geocoding API (one billable call).
 *
 * @param name - Place name or address.
 * @param apiKey - Server-side Google Maps key.
 * @param fetchFn - Injectable fetch, for tests.
 * @returns The first match, or null when Google finds nothing.
 * @throws MapsQuotaError on `OVER_QUERY_LIMIT` / `OVER_DAILY_LIMIT`.
 * @throws MapsRequestDeniedError on `REQUEST_DENIED` / `INVALID_REQUEST`.
 * @throws Error on HTTP failures, timeouts and unknown statuses.
 */
export async function geocodeByName(
  name: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Coordinates | null> {
  const url = new URL(GEOCODE_ENDPOINT);
  url.searchParams.set('address', name);
  url.searchParams.set('language', 'zh-TW');
  url.searchParams.set('key', apiKey);

  const res = await fetchFn(url.toString(), {
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
  });
  if (!res.ok) {
    // The request URL carries the API key, so only the status is logged.
    logger.warn('Google geocoding request failed', { status: res.status });
    throw new Error(`Geocoding request failed with HTTP ${res.status}`);
  }

  const body = (await res.json()) as GeocodeResponse;
  switch (body.status) {
    case 'OK': {
      const location = body.results?.[0]?.geometry.location;
      return location ? { lat: location.lat, lng: location.lng } : null;
    }
    case 'ZERO_RESULTS':
      return null;
    case 'OVER_QUERY_LIMIT':
    case 'OVER_DAILY_LIMIT':
      throw new MapsQuotaError(body.status);
    case 'REQUEST_DENIED':
    case 'INVALID_REQUEST':
      logger.error('Google geocoding request was rejected', {
        status: body.status,
        message: body.error_message,
      });
      throw new MapsRequestDeniedError(body.status);
    default:
      throw new Error(`Unexpected geocoding status ${body.status}`);
  }
}
