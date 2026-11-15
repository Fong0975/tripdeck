import type { WeatherResult } from '@tripdeck/shared';

import { createLogger } from '../logger';
import { TtlCache } from '../utils/ttlCache';

import { getWeatherKeys } from './config';
import { fetchOwmWeather, geocode, type GeoResult } from './openWeatherMap';
import { fetchVcWeather } from './visualCrossing';

const logger = createLogger('weather');

/** OWM's free forecast covers today plus the next 4 days. */
const OWM_MAX_DAYS_AHEAD = 4;

export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 500;

/** Place coordinates rarely change, so they outlive the forecast cache. */
export const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const GEO_CACHE_MAX_ENTRIES = 500;

// Reads `Date.now` at call time (rather than capturing the function) so fake
// timers in tests also drive cache expiry.
const currentTime = (): number => Date.now();

// The endpoint is public, so caching keeps repeated lookups from draining the
// providers' API quotas.
const cache = new TtlCache<WeatherResult>(
  CACHE_TTL_MS,
  CACHE_MAX_ENTRIES,
  currentTime,
);

// Lets every date of a trip reuse one geocoding call per place. Only hits are
// stored: `geocode` returns null for both "no match" and transient failures.
const geoCache = new TtlCache<GeoResult>(
  GEO_CACHE_TTL_MS,
  GEO_CACHE_MAX_ENTRIES,
  currentTime,
);

// `daysFromToday` decides which provider is consulted, so it is part of the
// key; otherwise one request could pin another's result for the whole TTL.
function cacheKey(
  locationName: string,
  date: string,
  daysFromToday: number,
): string {
  return `${locationName}::${date}::${daysFromToday}`;
}

/** Test-only: clears the in-memory response and geocoding caches. */
export function __resetCacheForTests(): void {
  cache.clear();
  geoCache.clear();
}

async function geocodeCached(
  locationName: string,
  owmKey: string,
): Promise<GeoResult | null> {
  const hit = geoCache.get(locationName);
  if (hit) {
    return hit;
  }
  const geo = await geocode(locationName, owmKey).catch(() => null);
  if (geo) {
    geoCache.set(locationName, geo);
  }
  return geo;
}

/** True when at least one weather provider has an API key configured. */
export function isWeatherEnabled(): boolean {
  const { owmKey, vcKey } = getWeatherKeys();
  return !!(owmKey || vcKey);
}

async function lookupWeather(
  locationName: string,
  dateStr: string,
  daysFromToday: number,
): Promise<WeatherResult> {
  const { owmKey, vcKey } = getWeatherKeys();
  const owmApplicable = !!owmKey && daysFromToday <= OWM_MAX_DAYS_AHEAD;
  const vcApplicable = !!vcKey;

  if (!owmApplicable && !vcApplicable) {
    return owmKey && daysFromToday > OWM_MAX_DAYS_AHEAD
      ? { status: 'out_of_range' }
      : { status: 'error' };
  }

  const tag = `${locationName} (${dateStr})`;

  // Geocode with OWM whenever the key is available — lat/lon works with both
  // APIs and avoids passing non-English names to Visual Crossing.
  let geo: GeoResult | null = null;
  if (owmKey) {
    geo = await geocodeCached(locationName, owmKey);
    if (!geo) {
      logger.debug(`${tag}: no data — geocoding failed`);
      return { status: 'not_found' };
    }
  }

  let result: WeatherResult = { status: 'error' };

  if (owmApplicable && geo) {
    result = await fetchOwmWeather(geo, dateStr, owmKey).catch(
      (): WeatherResult => ({ status: 'error' }),
    );
    if (result.status === 'success') {
      logger.debug(`${tag}: OpenWeatherMap`);
    }
  }

  if (result.status !== 'success' && vcApplicable) {
    // Prefer lat,lon (from OWM geocoding) so VC can resolve any language name;
    // fall back to the raw name when no OWM key is configured.
    const vcLocation = geo ? `${geo.lat},${geo.lon}` : locationName;
    const vcDisplayName = geo?.resolvedName ?? locationName;
    result = await fetchVcWeather(
      vcLocation,
      vcDisplayName,
      dateStr,
      vcKey,
    ).catch((): WeatherResult => ({ status: 'error' }));
    if (result.status === 'success') {
      logger.debug(`${tag}: Visual Crossing`);
    }
  }

  if (result.status !== 'success') {
    logger.debug(`${tag}: no data — status=${result.status}`);
  }

  return result;
}

/**
 * Looks up one place's weather for one date, preferring OpenWeatherMap within
 * its forecast range and falling back to Visual Crossing.
 *
 * @param locationName - Place name in any language.
 * @param dateStr - Target date as `YYYY-MM-DD`.
 * @param daysFromToday - Days between the client's local today and `dateStr`;
 *   supplied by the client because the server's timezone may differ.
 * @returns The weather result, served from cache when still fresh.
 */
export async function getDailyWeather(
  locationName: string,
  dateStr: string,
  daysFromToday: number,
): Promise<WeatherResult> {
  const key = cacheKey(locationName, dateStr, daysFromToday);
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const result = await lookupWeather(locationName, dateStr, daysFromToday);
  // Transient failures aren't cached so the next lookup can retry.
  if (result.status !== 'error') {
    cache.set(key, result);
  }
  return result;
}
