import type { WeatherResult } from '@/utils/weatherApi/types';

import { api } from './client';

export async function getWeatherStatus(): Promise<{ enabled: boolean }> {
  return api<{ enabled: boolean }>('/api/weather/status');
}

/**
 * Looks up one place's weather through the backend, which holds the
 * provider API keys.
 *
 * @param days - Days between the browser's local today and `date`, so the
 *   backend doesn't have to guess the user's timezone.
 */
export async function getWeather(
  location: string,
  date: string,
  days: number,
): Promise<WeatherResult> {
  const params = new URLSearchParams({ location, date, days: String(days) });
  return api<WeatherResult>(`/api/weather?${params.toString()}`);
}
