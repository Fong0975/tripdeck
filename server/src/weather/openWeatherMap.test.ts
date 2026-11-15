import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { mockLogger } from '../test-utils/loggerMock';

import { fetchOwmWeather, geocode, type GeoResult } from './openWeatherMap';

const API_KEY = 'owm-secret';

function makeResponse(ok: boolean, body: unknown, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

interface ForecastEntryOverrides {
  /** Entry time as a UTC ISO string. */
  utc?: string;
  temp?: number;
  humidity?: number;
  icon?: string;
  description?: string;
  pop?: number;
}

function makeForecastEntry(overrides: ForecastEntryOverrides = {}) {
  return {
    dt: Date.parse(overrides.utc ?? '2026-01-01T12:00:00Z') / 1000,
    main: {
      temp: overrides.temp ?? 20,
      humidity: overrides.humidity ?? 50,
    },
    weather: [
      {
        icon: overrides.icon ?? '01d',
        description: overrides.description ?? 'clear sky',
      },
    ],
    pop: overrides.pop ?? 0,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('geocode', () => {
  it('sends the API key with a timeout signal', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, []));

    await geocode('東京', API_KEY);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain(`q=${encodeURIComponent('東京')}`);
    expect(url).toContain(`appid=${API_KEY}`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns null and logs only the status when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(false, [], 401));

    expect(await geocode('Tokyo', API_KEY)).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'OWM geocoding request failed',
      { status: 401 },
    );
  });

  it('returns null when no results are found', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, []));

    expect(await geocode('Nowhere', API_KEY)).toBeNull();
  });

  it.each([
    {
      description: 'a zh local name is available',
      row: { lat: 1, lon: 2, name: 'Tokyo', local_names: { zh: '東京' } },
      expectedName: '東京',
    },
    {
      description: 'no zh local name is available',
      row: { lat: 1, lon: 2, name: 'Tokyo' },
      expectedName: 'Tokyo',
    },
  ])('resolves the name when $description', async ({ row, expectedName }) => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, [row]));

    expect(await geocode('Tokyo', API_KEY)).toEqual({
      lat: 1,
      lon: 2,
      resolvedName: expectedName,
    });
  });
});

describe('fetchOwmWeather', () => {
  const geo: GeoResult = { lat: 1, lon: 2, resolvedName: 'Tokyo' };

  it('sends the coordinates and API key with a timeout signal', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, { list: [makeForecastEntry()] }),
    );

    await fetchOwmWeather(geo, '2026-01-01', API_KEY);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('lat=1&lon=2');
    expect(url).toContain(`appid=${API_KEY}`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns error status and logs only the status when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(false, {}, 500));

    expect(await fetchOwmWeather(geo, '2026-01-01', API_KEY)).toEqual({
      status: 'error',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'OWM forecast request failed',
      { status: 500 },
    );
  });

  it('returns out_of_range status when no entries match the date', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, {
        list: [makeForecastEntry({ utc: '2026-02-01T12:00:00Z' })],
      }),
    );

    expect(await fetchOwmWeather(geo, '2026-01-01', API_KEY)).toEqual({
      status: 'out_of_range',
    });
  });

  it('aggregates the matching entries into a single day summary', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, {
        list: [
          makeForecastEntry({
            utc: '2026-01-01T09:00:00Z',
            temp: 18,
            pop: 0.2,
          }),
          makeForecastEntry({
            utc: '2026-01-01T12:00:00Z',
            temp: 25,
            humidity: 60,
            pop: 0.5,
          }),
          makeForecastEntry({
            utc: '2026-01-01T15:00:00Z',
            temp: 22,
            pop: 0.1,
          }),
        ],
        city: { timezone: 0 },
      }),
    );

    expect(await fetchOwmWeather(geo, '2026-01-01', API_KEY)).toEqual({
      status: 'success',
      source: 'openweathermap',
      data: {
        resolvedName: 'Tokyo',
        icon: 'clear',
        description: 'clear sky',
        tempMin: 18,
        tempMax: 25,
        humidity: 60,
        pop: 50,
      },
    });
  });

  it.each([
    {
      description: 'UTC+9 destination',
      timezone: 9 * 3600,
      // Local 2026-01-01 spans 2025-12-31T15:00Z to 2026-01-01T15:00Z.
      expected: { tempMin: 10, tempMax: 30, midday: 'local noon (03:00Z)' },
    },
    {
      description: 'UTC-5 destination',
      timezone: -5 * 3600,
      // Local 2026-01-01 spans 2026-01-01T05:00Z to 2026-01-02T05:00Z.
      expected: { tempMin: 15, tempMax: 40, midday: 'local 13:00 (18:00Z)' },
    },
    {
      description: 'response without a timezone (treated as UTC)',
      timezone: undefined,
      expected: { tempMin: 15, tempMax: 30, midday: 'utc noon (12:00Z)' },
    },
  ])(
    'groups entries by the local day of a $description',
    async ({ timezone, expected }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, {
          list: [
            makeForecastEntry({ utc: '2025-12-31T18:00:00Z', temp: 10 }),
            makeForecastEntry({
              utc: '2026-01-01T03:00:00Z',
              temp: 20,
              description: 'local noon (03:00Z)',
            }),
            makeForecastEntry({
              utc: '2026-01-01T12:00:00Z',
              temp: 30,
              description: 'utc noon (12:00Z)',
            }),
            makeForecastEntry({ utc: '2026-01-01T15:00:00Z', temp: 15 }),
            makeForecastEntry({
              utc: '2026-01-01T18:00:00Z',
              temp: 25,
              description: 'local 13:00 (18:00Z)',
            }),
            makeForecastEntry({ utc: '2026-01-02T03:00:00Z', temp: 40 }),
          ],
          ...(timezone === undefined ? {} : { city: { timezone } }),
        }),
      );

      const result = await fetchOwmWeather(geo, '2026-01-01', API_KEY);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.tempMin).toBe(expected.tempMin);
        expect(result.data.tempMax).toBe(expected.tempMax);
        expect(result.data.description).toBe(expected.midday);
      }
    },
  );

  it('defaults pop to 0 when an entry omits the pop field', async () => {
    const entryWithoutPop = {
      dt: Date.parse('2026-01-01T12:00:00Z') / 1000,
      main: { temp: 20, humidity: 50 },
      weather: [{ icon: '01d', description: 'clear sky' }],
    };
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, { list: [entryWithoutPop] }),
    );

    const result = await fetchOwmWeather(geo, '2026-01-01', API_KEY);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.pop).toBe(0);
    }
  });

  it.each([
    { code: '01d', expected: 'clear' },
    { code: '02n', expected: 'partly-cloudy' },
    { code: '03d', expected: 'cloudy' },
    { code: '04d', expected: 'cloudy' },
    { code: '09d', expected: 'drizzle' },
    { code: '10d', expected: 'rain' },
    { code: '11d', expected: 'thunder' },
    { code: '13d', expected: 'snow' },
    { code: '50d', expected: 'fog' },
    { code: '99d', expected: 'cloudy' },
  ])(
    'normalizes OWM icon code $code to $expected',
    async ({ code, expected }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, { list: [makeForecastEntry({ icon: code })] }),
      );

      const result = await fetchOwmWeather(geo, '2026-01-01', API_KEY);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.icon).toBe(expected);
      }
    },
  );
});
