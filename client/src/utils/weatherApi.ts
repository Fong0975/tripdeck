const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined;
const OWM_BASE = 'https://api.openweathermap.org';

export const isWeatherEnabled = !!OWM_KEY;

export interface DailyWeatherData {
  resolvedName: string;
  icon: string;
  description: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pop: number;
}

export type WeatherResult =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'out_of_range' }
  | { status: 'error' }
  | { status: 'success'; data: DailyWeatherData };

// Module-level cache survives tab switches within the same session.
const _cache = new Map<string, WeatherResult>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
}

async function geocode(
  name: string,
): Promise<{ lat: number; lon: number; resolvedName: string } | null> {
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

export async function fetchDailyWeather(
  locationName: string,
  dateStr: string,
): Promise<WeatherResult> {
  if (!OWM_KEY) {
    return { status: 'error' };
  }

  const key = cacheKey(locationName, dateStr);
  const hit = _cache.get(key);
  if (hit) {
    return hit;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000,
  );

  if (diffDays > 4) {
    const r: WeatherResult = { status: 'out_of_range' };
    _cache.set(key, r);
    return r;
  }

  const geo = await geocode(locationName);
  if (!geo) {
    const r: WeatherResult = { status: 'not_found' };
    _cache.set(key, r);
    return r;
  }

  const res = await fetch(
    `${OWM_BASE}/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&appid=${OWM_KEY}&units=metric&lang=zh_tw&cnt=40`,
  );
  if (!res.ok) {
    const r: WeatherResult = { status: 'error' };
    _cache.set(key, r);
    return r;
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
    const r: WeatherResult = { status: 'out_of_range' };
    _cache.set(key, r);
    return r;
  }

  const midday =
    entries.find(e => e.dt_txt.includes('12:00')) ??
    entries[Math.floor(entries.length / 2)];
  const temps = entries.map(e => e.main.temp);
  const maxPop = Math.max(...entries.map(e => e.pop ?? 0));

  const r: WeatherResult = {
    status: 'success',
    data: {
      resolvedName: geo.resolvedName,
      icon: midday.weather[0].icon,
      description: midday.weather[0].description,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      humidity: midday.main.humidity,
      pop: Math.round(maxPop * 100),
    },
  };
  _cache.set(key, r);
  return r;
}
