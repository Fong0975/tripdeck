import type { WeatherIconCode, WeatherResult } from './types';

export const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined;
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

export async function geocode(name: string): Promise<GeoResult | null> {
  const res = await fetch(
    `${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(name)}&limit=1&appid=${OWM_KEY}`,
  );
  if (!res.ok) {
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

export async function fetchOwmWeather(
  geo: GeoResult,
  dateStr: string,
): Promise<WeatherResult> {
  const res = await fetch(
    `${OWM_BASE}/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&appid=${OWM_KEY}&units=metric&lang=zh_tw&cnt=40`,
  );
  if (!res.ok) {
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
