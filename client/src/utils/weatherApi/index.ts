import { getWeather, getWeatherStatus } from '@/api/weather';
import { daysFromToday } from '@/utils/date';

import type { WeatherResult } from './types';

export type {
  DailyWeatherData,
  WeatherIconCode,
  WeatherResult,
  WeatherSource,
} from './types';

let _enabled: Promise<boolean> | null = null;

/**
 * Resolves whether the backend has a weather provider configured. The status
 * is fetched once per page load; a failed request counts as disabled.
 */
export function getWeatherEnabled(): Promise<boolean> {
  _enabled ??= getWeatherStatus()
    .then(({ enabled }) => enabled)
    .catch(() => false);
  return _enabled;
}

/**
 * Session cache of lookups keyed by place + date. It stores the promise rather
 * than the settled result so concurrent callers (e.g. several day columns
 * asking for the same place and date) share a single in-flight request.
 */
const _cache = new Map<string, Promise<WeatherResult>>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
}

/**
 * Fetches one place's weather for one date via the backend, memoized for the
 * rest of the page session. Concurrent calls for the same place and date share
 * one request. Error results are evicted once settled so a later call retries.
 */
export function fetchDailyWeather(
  locationName: string,
  dateStr: string,
): Promise<WeatherResult> {
  const key = cacheKey(locationName, dateStr);
  const hit = _cache.get(key);
  if (hit) {
    return hit;
  }

  const pending = getWeather(locationName, dateStr, daysFromToday(dateStr))
    .catch((): WeatherResult => ({ status: 'error' }))
    .then(result => {
      if (result.status === 'error' && _cache.get(key) === pending) {
        _cache.delete(key);
      }
      return result;
    });

  _cache.set(key, pending);
  return pending;
}

/**
 * Test-only: clears the session result cache and the memoized weather-enabled
 * promise so each test starts from a clean module state.
 */
export function __resetCacheForTests(): void {
  _cache.clear();
  _enabled = null;
}
