import type { WeatherResult } from '@tripdeck/shared';

export type {
  DailyWeatherData,
  WeatherIconCode,
  WeatherResult,
  WeatherSource,
} from '@tripdeck/shared';

/** What a weather card shows: a settled lookup result, or a pending lookup. */
export type WeatherState = WeatherResult | { status: 'loading' };
