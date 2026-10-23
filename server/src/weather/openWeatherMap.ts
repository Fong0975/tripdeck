import { createLogger } from '../logger';

import {
  WEATHER_FETCH_TIMEOUT_MS,
  type WeatherIconCode,
  type WeatherResult,
} from './types';

const logger = createLogger('weather');

const OWM_BASE = 'https://api.openweathermap.org';

export interface GeoResult {
  lat: number;
  lon: number;
  resolvedName: string;
}

function normalizeOwmIcon(owmCode: string): WeatherIconCode {
  const id = parseInt(owmCode.slice(0, 2), 10);
  if (id === 1) {
    return 'clear';
  }
  if (id === 2) {
    return 'partly-cloudy';
  }
  if (id === 3 || id === 4) {
    return 'cloudy';
  }
  if (id === 9) {
    return 'drizzle';
  }
  if (id === 10) {
    return 'rain';
  }
  if (id === 11) {
    return 'thunder';
  }
  if (id === 13) {
    return 'snow';
  }
  if (id === 50) {
    return 'fog';
  }
  return 'cloudy';
}

/**
 * Resolves a place name to coordinates via the OWM geocoding API.
 *
 * @param name - Place name in any language.
 * @param apiKey - OpenWeatherMap API key.
 * @returns The first match, or null when nothing matches or the request fails.
 */
export async function geocode(
  name: string,
  apiKey: string,
): Promise<GeoResult | null> {
  const res = await fetch(
    `${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(name)}&limit=1&appid=${apiKey}`,
    { signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS) },
  );
  if (!res.ok) {
    // The request URL carries the API key, so only the status is logged.
    logger.warn('OWM geocoding request failed', { status: res.status });
    return null;
  }

  interface GeoRow {
    lat: number;
    lon: number;
    name: string;
    local_names?: Record<string, string>;
  }
  const data = (await res.json()) as GeoRow[];
  if (!data.length) {
    return null;
  }

  return {
    lat: data[0].lat,
    lon: data[0].lon,
    resolvedName: data[0].local_names?.zh ?? data[0].name,
  };
}

/**
 * Summarizes the OWM 5-day / 3-hour forecast entries for a single date.
 *
 * @param geo - Coordinates and display name of the place.
 * @param dateStr - Target date as `YYYY-MM-DD`.
 * @param apiKey - OpenWeatherMap API key.
 * @returns `out_of_range` when the forecast doesn't cover the date.
 */
export async function fetchOwmWeather(
  geo: GeoResult,
  dateStr: string,
  apiKey: string,
): Promise<WeatherResult> {
  const res = await fetch(
    `${OWM_BASE}/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=metric&lang=zh_tw&cnt=40`,
    { signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS) },
  );
  if (!res.ok) {
    logger.warn('OWM forecast request failed', { status: res.status });
    return { status: 'error' };
  }

  interface ForecastEntry {
    dt_txt: string;
    main: { temp: number; humidity: number };
    weather: [{ icon: string; description: string }];
    pop?: number;
  }
  const json = (await res.json()) as { list: ForecastEntry[] };
  const entries = json.list.filter(e => e.dt_txt.startsWith(dateStr));

  if (!entries.length) {
    return { status: 'out_of_range' };
  }

  const midday =
    entries.find(e => e.dt_txt.includes('12:00')) ??
    entries[Math.floor(entries.length / 2)];
  const temps = entries.map(e => e.main.temp);
  const maxPop = Math.max(...entries.map(e => e.pop ?? 0));

  return {
    status: 'success',
    data: {
      resolvedName: geo.resolvedName,
      icon: normalizeOwmIcon(midday.weather[0].icon),
      description: midday.weather[0].description,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      humidity: midday.main.humidity,
      pop: Math.round(maxPop * 100),
    },
  };
}
