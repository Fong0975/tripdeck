import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import { getWeather, getWeatherStatus } from './weather';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('getWeatherStatus', () => {
  it('GETs the weather status endpoint', async () => {
    await getWeatherStatus();

    expect(api).toHaveBeenCalledWith('/api/weather/status');
  });
});

describe('getWeather', () => {
  it.each([
    {
      description: 'a plain name',
      location: 'Tokyo',
      days: 3,
      expectedUrl: '/api/weather?location=Tokyo&date=2026-08-20&days=3',
    },
    {
      description: 'a non-ASCII name and negative days',
      location: '東京 駅',
      days: -1,
      expectedUrl:
        '/api/weather?location=%E6%9D%B1%E4%BA%AC+%E9%A7%85&date=2026-08-20&days=-1',
    },
  ])(
    'GETs the weather endpoint with $description encoded in the query',
    async ({ location, days, expectedUrl }) => {
      await getWeather(location, '2026-08-20', days);

      expect(api).toHaveBeenCalledWith(expectedUrl);
    },
  );
});
