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

const _cache = new Map<string, WeatherResult>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
}

/**
 * Fetches one place's weather for one date via the backend, memoized for the
 * rest of the page session. Errors aren't memoized so a later render retries.
 */
export async function fetchDailyWeather(
  locationName: string,
  dateStr: string,
): Promise<WeatherResult> {
  const key = cacheKey(locationName, dateStr);
  const hit = _cache.get(key);
  if (hit) {
    return hit;
  }

  const result = await getWeather(
    locationName,
    dateStr,
    daysFromToday(dateStr),
  ).catch((): WeatherResult => ({ status: 'error' }));

  if (result.status !== 'error') {
    _cache.set(key, result);
  }
  return result;
}
