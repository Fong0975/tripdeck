import { describe, expect, it, vi } from 'vitest';

import type { WeatherResult } from './types';

const SUCCESS: WeatherResult = {
  status: 'success',
  source: 'openweathermap',
  data: {
    resolvedName: 'Tokyo',
    icon: 'clear',
    description: 'Clear',
    tempMin: 20,
    tempMax: 28,
    humidity: 50,
    pop: 0,
  },
};

/** Loads a fresh module instance so each test starts with empty caches. */
async function loadWeatherApi(daysFromTodayValue = 0) {
  vi.resetModules();
  const daysFromToday = vi.fn().mockReturnValue(daysFromTodayValue);
  const getWeather = vi.fn();
  const getWeatherStatus = vi.fn();

  vi.doMock('@/utils/date', () => ({ daysFromToday }));
  vi.doMock('@/api/weather', () => ({ getWeather, getWeatherStatus }));

  const mod = await import('./index');
  return { ...mod, daysFromToday, getWeather, getWeatherStatus };
}

describe('getWeatherEnabled', () => {
  it.each([
    {
      description: 'the backend reports enabled',
      setup: (fn: ReturnType<typeof vi.fn>) =>
        fn.mockResolvedValue({ enabled: true }),
      expected: true,
    },
    {
      description: 'the backend reports disabled',
      setup: (fn: ReturnType<typeof vi.fn>) =>
        fn.mockResolvedValue({ enabled: false }),
      expected: false,
    },
    {
      description: 'the status request fails',
      setup: (fn: ReturnType<typeof vi.fn>) =>
        fn.mockRejectedValue(new Error('API error 500')),
      expected: false,
    },
  ])('resolves $expected when $description', async ({ setup, expected }) => {
    const api = await loadWeatherApi();
    setup(api.getWeatherStatus);

    expect(await api.getWeatherEnabled()).toBe(expected);
  });

  it('requests the status only once', async () => {
    const api = await loadWeatherApi();
    api.getWeatherStatus.mockResolvedValue({ enabled: true });

    await Promise.all([api.getWeatherEnabled(), api.getWeatherEnabled()]);
    await api.getWeatherEnabled();

    expect(api.getWeatherStatus).toHaveBeenCalledTimes(1);
  });
});

describe('fetchDailyWeather', () => {
  it('passes the client-side days-from-today to the backend', async () => {
    const api = await loadWeatherApi(3);
    api.getWeather.mockResolvedValue(SUCCESS);

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual(SUCCESS);
    expect(api.daysFromToday).toHaveBeenCalledWith('2026-08-20');
    expect(api.getWeather).toHaveBeenCalledWith('Tokyo', '2026-08-20', 3);
  });

  it('returns error when the backend request fails', async () => {
    const api = await loadWeatherApi();
    api.getWeather.mockRejectedValue(new Error('API error 500'));

    expect(await api.fetchDailyWeather('Tokyo', '2026-08-20')).toEqual({
      status: 'error',
    });
  });

  it.each([
    {
      description: 'serves a repeated lookup from cache',
      first: SUCCESS,
      second: { location: 'Tokyo', date: '2026-08-20' },
      expectedCalls: 1,
    },
    {
      description: 'caches non-error statuses too',
      first: { status: 'out_of_range' } as WeatherResult,
      second: { location: 'Tokyo', date: '2026-08-20' },
      expectedCalls: 1,
    },
    {
      description: 'does not cache error results',
      first: { status: 'error' } as WeatherResult,
      second: { location: 'Tokyo', date: '2026-08-20' },
      expectedCalls: 2,
    },
    {
      description: 'uses a separate entry for a different date',
      first: SUCCESS,
      second: { location: 'Tokyo', date: '2026-08-21' },
      expectedCalls: 2,
    },
    {
      description: 'uses a separate entry for a different location',
      first: SUCCESS,
      second: { location: 'Osaka', date: '2026-08-20' },
      expectedCalls: 2,
    },
  ])('$description', async ({ first, second, expectedCalls }) => {
    const api = await loadWeatherApi();
    api.getWeather.mockResolvedValue(first);

    await api.fetchDailyWeather('Tokyo', '2026-08-20');
    await api.fetchDailyWeather(second.location, second.date);

    expect(api.getWeather).toHaveBeenCalledTimes(expectedCalls);
  });
});
