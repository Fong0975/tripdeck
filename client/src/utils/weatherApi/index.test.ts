import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getWeather, getWeatherStatus } from '@/api/weather';
import { makeWeatherSuccess } from '@/test-utils/fixtures';
import { daysFromToday } from '@/utils/date';

import type { WeatherResult } from './types';

import {
  __resetCacheForTests,
  fetchDailyWeather,
  getWeatherEnabled,
} from './index';

vi.mock('@/utils/date', () => ({ daysFromToday: vi.fn() }));
vi.mock('@/api/weather', () => ({
  getWeather: vi.fn(),
  getWeatherStatus: vi.fn(),
}));

const SUCCESS = makeWeatherSuccess();

beforeEach(() => {
  __resetCacheForTests();
  vi.mocked(daysFromToday).mockReturnValue(0);
});

describe('getWeatherEnabled', () => {
  it.each([
    {
      description: 'the backend reports enabled',
      setup: () =>
        vi.mocked(getWeatherStatus).mockResolvedValue({ enabled: true }),
      expected: true,
    },
    {
      description: 'the backend reports disabled',
      setup: () =>
        vi.mocked(getWeatherStatus).mockResolvedValue({ enabled: false }),
      expected: false,
    },
    {
      description: 'the status request fails',
      setup: () =>
        vi
          .mocked(getWeatherStatus)
          .mockRejectedValue(new Error('API error 500')),
      expected: false,
    },
  ])('resolves $expected when $description', async ({ setup, expected }) => {
    setup();

    expect(await getWeatherEnabled()).toBe(expected);
  });

  it('requests the status only once', async () => {
    vi.mocked(getWeatherStatus).mockResolvedValue({ enabled: true });

    await Promise.all([getWeatherEnabled(), getWeatherEnabled()]);
    await getWeatherEnabled();

    expect(getWeatherStatus).toHaveBeenCalledTimes(1);
  });
});

describe('fetchDailyWeather', () => {
  it('passes the client-side days-from-today to the backend', async () => {
    vi.mocked(daysFromToday).mockReturnValue(3);
    vi.mocked(getWeather).mockResolvedValue(SUCCESS);

    const result = await fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual(SUCCESS);
    expect(daysFromToday).toHaveBeenCalledWith('2026-08-20');
    expect(getWeather).toHaveBeenCalledWith('Tokyo', '2026-08-20', 3);
  });

  it('returns error when the backend request fails', async () => {
    vi.mocked(getWeather).mockRejectedValue(new Error('API error 500'));

    expect(await fetchDailyWeather('Tokyo', '2026-08-20')).toEqual({
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
    vi.mocked(getWeather).mockResolvedValue(first);

    await fetchDailyWeather('Tokyo', '2026-08-20');
    await fetchDailyWeather(second.location, second.date);

    expect(getWeather).toHaveBeenCalledTimes(expectedCalls);
  });
});
