const OWM_KEY = import.meta.env.VITE_OWM_API_KEY as string | undefined;
const VC_KEY = import.meta.env.VITE_VC_API_KEY as string | undefined;
const OWM_BASE = 'https://api.openweathermap.org';
const VC_BASE =
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

export const isWeatherEnabled = !!(OWM_KEY || VC_KEY);

export type WeatherIconCode =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

export interface DailyWeatherData {
  resolvedName: string;
  icon: WeatherIconCode;
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

const _cache = new Map<string, WeatherResult>();

function cacheKey(locationName: string, date: string): string {
  return `${locationName}::${date}`;
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

function normalizeVcIcon(vcCode: string): WeatherIconCode {
  if (vcCode.startsWith('clear')) {
    return 'clear';
  }
  if (vcCode.startsWith('partly-cloudy')) {
    return 'partly-cloudy';
  }
  if (vcCode === 'cloudy' || vcCode === 'wind') {
    return 'cloudy';
  }
  if (vcCode === 'fog') {
    return 'fog';
  }
  if (
    vcCode.startsWith('snow') ||
    vcCode.startsWith('sleet') ||
    vcCode === 'hail'
  ) {
    return 'snow';
  }
  if (vcCode.startsWith('thunder')) {
    return 'thunder';
  }
  if (vcCode === 'rain' || vcCode.startsWith('showers')) {
    return 'rain';
  }
  return 'cloudy';
}

interface GeoResult {
  lat: number;
  lon: number;
  resolvedName: string;
}

async function geocode(name: string): Promise<GeoResult | null> {
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

async function fetchOwmWeather(
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

async function fetchVcWeather(
  location: string,
  resolvedName: string,
  dateStr: string,
): Promise<WeatherResult> {
  const url = `${VC_BASE}/${encodeURIComponent(location)}/${dateStr}?key=${VC_KEY}&unitGroup=metric&lang=zh&include=days&elements=datetime,tempmin,tempmax,humidity,precipprob,icon,description,resolvedAddress`;

  const res = await fetch(url);
  if (res.status === 400 || res.status === 404) {
    return { status: 'not_found' };
  }
  if (!res.ok) {
    return { status: 'error' };
  }

  interface VcDay {
    tempmin: number;
    tempmax: number;
    humidity: number;
    precipprob: number;
    icon: string;
    description: string;
  }
  interface VcResponse {
    resolvedAddress: string;
    days: VcDay[];
  }

  const json = (await res.json()) as VcResponse;
  const day = json.days?.[0];
  if (!day) {
    return { status: 'not_found' };
  }

  return {
    status: 'success',
    data: {
      resolvedName: json.resolvedAddress || resolvedName,
      icon: normalizeVcIcon(day.icon),
      description: day.description,
      tempMin: Math.round(day.tempmin),
      tempMax: Math.round(day.tempmax),
      humidity: Math.round(day.humidity),
      pop: Math.round(day.precipprob),
    },
  };
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (new Date(`${dateStr}T00:00:00`).getTime() - today.getTime()) / 86_400_000,
  );

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
