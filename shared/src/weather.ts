/** Provider-independent weather condition, used to pick an icon. */
export type WeatherIconCode =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

/** One place's forecast for one day. */
export interface DailyWeatherData {
  /** Place name as the provider resolved it. */
  resolvedName: string;
  icon: WeatherIconCode;
  description: string;
  /** Degrees Celsius. */
  tempMin: number;
  /** Degrees Celsius. */
  tempMax: number;
  /** Relative humidity, in percent. */
  humidity: number;
  /** Probability of precipitation, in percent (0 to 100). */
  pop: number;
}

/** Provider that supplied a successful result. */
export type WeatherSource = 'openweathermap' | 'visualcrossing';

/** Response of `GET /api/weather`. */
export type WeatherResult =
  | { status: 'not_found' }
  | { status: 'out_of_range' }
  | { status: 'error' }
  | { status: 'success'; source: WeatherSource; data: DailyWeatherData };

/** Response of `GET /api/weather/status`. */
export interface WeatherStatus {
  /** The weather feature is configured on the server. */
  enabled: boolean;
}
