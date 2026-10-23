import { createLogger } from '../logger';

import { getWeatherKeys } from './config';
import { fetchOwmWeather, geocode, type GeoResult } from './openWeatherMap';
import type { WeatherResult } from './types';
import { fetchVcWeather } from './visualCrossing';

const logger = createLogger('weather');

/** OWM's free forecast covers today plus the next 4 days. */
const OWM_MAX_DAYS_AHEAD = 4;

export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  result: WeatherResult;
  expiresAt: number;
}

// The endpoint is public, so caching keeps repeated lookups from draining the
// providers' API quotas. Insertion order doubles as age order for eviction.
const cache = new Map<string, CacheEntry>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
}

function readCache(key: string): WeatherResult | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

/** Transient failures aren't cached so the next lookup can retry. */
function writeCache(key: string, result: WeatherResult): void {
  if (result.status === 'error') {
    return;
  }
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
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
    geo = await geocode(locationName, owmKey).catch(() => null);
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
  const key = cacheKey(locationName, dateStr);
  const hit = readCache(key);
  if (hit) {
    return hit;
  }

  const result = await lookupWeather(locationName, dateStr, daysFromToday);
  writeCache(key, result);
  return result;
}
