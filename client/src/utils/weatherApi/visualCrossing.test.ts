import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchVcWeather } from './visualCrossing';

function makeResponse(ok: boolean, status: number, body: unknown): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

interface VcDayOverrides {
  tempmin?: number;
  tempmax?: number;
  humidity?: number;
  precipprob?: number;
  icon?: string;
  description?: string;
}

function makeVcDay(overrides: VcDayOverrides = {}) {
  return {
    tempmin: overrides.tempmin ?? 15,
    tempmax: overrides.tempmax ?? 25,
    humidity: overrides.humidity ?? 55.4,
    precipprob: overrides.precipprob ?? 12.6,
    icon: overrides.icon ?? 'clear-day',
    description: overrides.description ?? 'Clear',
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchVcWeather', () => {
  it.each([
    { description: 'the response status is 400', status: 400 },
    { description: 'the response status is 404', status: 404 },
  ])('returns not_found when $description', async ({ status }) => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(false, status, {}));

    expect(await fetchVcWeather('Tokyo', 'Tokyo', '2026-01-01')).toEqual({
      status: 'not_found',
    });
  });

  it('returns error when the response is not ok for another reason', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(false, 500, {}));

    expect(await fetchVcWeather('Tokyo', 'Tokyo', '2026-01-01')).toEqual({
      status: 'error',
    });
  });

  it('returns not_found when the response has no days', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, 200, { resolvedAddress: 'Tokyo', days: [] }),
    );

    expect(await fetchVcWeather('Tokyo', 'Tokyo', '2026-01-01')).toEqual({
      status: 'not_found',
    });
  });

  it('resolves data from the first day, rounding numeric fields', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, 200, {
        resolvedAddress: 'Tokyo, JP',
        days: [makeVcDay()],
      }),
    );

    expect(await fetchVcWeather('Tokyo', 'Fallback', '2026-01-01')).toEqual({
      status: 'success',
      data: {
        resolvedName: 'Tokyo, JP',
        icon: 'clear',
        description: 'Clear',
        tempMin: 15,
        tempMax: 25,
        humidity: 55,
        pop: 13,
      },
    });
  });

  it('falls back to the given resolvedName when resolvedAddress is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, 200, { resolvedAddress: '', days: [makeVcDay()] }),
    );

    const result = await fetchVcWeather('Tokyo', 'Fallback', '2026-01-01');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.resolvedName).toBe('Fallback');
    }
  });

  it.each([
    { code: 'clear-day', expected: 'clear' },
    { code: 'clear-night', expected: 'clear' },
    { code: 'partly-cloudy-day', expected: 'partly-cloudy' },
    { code: 'partly-cloudy-night', expected: 'partly-cloudy' },
    { code: 'cloudy', expected: 'cloudy' },
    { code: 'wind', expected: 'cloudy' },
    { code: 'fog', expected: 'fog' },
    { code: 'snow', expected: 'snow' },
    { code: 'snow-showers-day', expected: 'snow' },
    { code: 'sleet', expected: 'snow' },
    { code: 'hail', expected: 'snow' },
    { code: 'thunder-rain', expected: 'thunder' },
    { code: 'rain', expected: 'rain' },
    { code: 'showers-day', expected: 'rain' },
    { code: 'unknown-code', expected: 'cloudy' },
  ])(
    'normalizes VC icon code $code to $expected',
    async ({ code, expected }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, 200, {
          resolvedAddress: 'Tokyo',
          days: [makeVcDay({ icon: code })],
        }),
      );

      const result = await fetchVcWeather('Tokyo', 'Tokyo', '2026-01-01');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.icon).toBe(expected);
      }
    },
  );
});
