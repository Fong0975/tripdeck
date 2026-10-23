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

/** Provider that supplied a successful result. */
export type WeatherSource = 'openweathermap' | 'visualcrossing';

export type WeatherResult =
  | { status: 'not_found' }
  | { status: 'out_of_range' }
  | { status: 'error' }
  | { status: 'success'; source: WeatherSource; data: DailyWeatherData };

/** Upper bound for every weather provider request. */
export const WEATHER_FETCH_TIMEOUT_MS = 8000;
