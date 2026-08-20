import { daysFromToday } from '@/utils/date';

import {
  OWM_KEY,
  fetchOwmWeather,
  geocode,
  type GeoResult,
} from './openWeatherMap';
import type { WeatherResult } from './types';
import { VC_KEY, fetchVcWeather } from './visualCrossing';

export type { DailyWeatherData, WeatherIconCode, WeatherResult } from './types';

export const isWeatherEnabled = !!(OWM_KEY || VC_KEY);

const _cache = new Map<string, WeatherResult>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
}

export async function fetchDailyWeather(
  locationName: string,
  dateStr: string,
): Promise<WeatherResult> {
  const key = cacheKey(locationName, dateStr);
  const hit = _cache.get(key);
  if (hit) {
    return hit;
  }

  const diffDays = daysFromToday(dateStr);

  const owmApplicable = !!OWM_KEY && diffDays <= 4;
  const vcApplicable = !!VC_KEY;

  if (!owmApplicable && !vcApplicable) {
    const r: WeatherResult =
      OWM_KEY && diffDays > 4
        ? { status: 'out_of_range' }
        : { status: 'error' };
    _cache.set(key, r);
    return r;
  }

  // Geocode with OWM whenever the key is available — lat/lon works with both APIs
  // and avoids passing non-English names to Visual Crossing.
  let geo: GeoResult | null = null;
  if (OWM_KEY) {
    geo = await geocode(locationName).catch(() => null);
    if (!geo) {
      const r: WeatherResult = { status: 'not_found' };
      _cache.set(key, r);
      // eslint-disable-next-line no-console
      console.log(
        `[Weather] ${locationName} (${dateStr}): no data — geocoding failed`,
      );
      return r;
    }
  }

  let result: WeatherResult = { status: 'error' };
  const tag = `[Weather] ${locationName} (${dateStr})`;

  if (owmApplicable && geo) {
    result = await fetchOwmWeather(geo, dateStr).catch(
      (): WeatherResult => ({ status: 'error' }),
    );
    if (result.status === 'success') {
      // eslint-disable-next-line no-console
      console.log(`${tag}: OpenWeatherMap`);
    }
  }

  if (result.status !== 'success' && vcApplicable) {
    // Prefer lat,lon (from OWM geocoding) so VC can resolve any language name;
    // fall back to the raw name when no OWM key is configured.
    const vcLocation = geo ? `${geo.lat},${geo.lon}` : locationName;
    const vcDisplayName = geo?.resolvedName ?? locationName;
    result = await fetchVcWeather(vcLocation, vcDisplayName, dateStr).catch(
      (): WeatherResult => ({ status: 'error' }),
    );
    if (result.status === 'success') {
      // eslint-disable-next-line no-console
      console.log(`${tag}: Visual Crossing`);
    }
  }

  if (result.status !== 'success') {
    // eslint-disable-next-line no-console
    console.log(`${tag}: no data — status=${result.status}`);
  }

  _cache.set(key, result);
  return result;
}
