import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../logger', () => ({
  createLogger: () => mockLogger,
}));

import { fetchOwmWeather, geocode, type GeoResult } from './openWeatherMap';

const API_KEY = 'owm-secret';

function makeResponse(ok: boolean, body: unknown, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

interface ForecastEntryOverrides {
  dt_txt?: string;
  temp?: number;
  humidity?: number;
  icon?: string;
  description?: string;
  pop?: number;
}

function makeForecastEntry(overrides: ForecastEntryOverrides = {}) {
  return {
    dt_txt: overrides.dt_txt ?? '2026-01-01 12:00:00',
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
  vi.clearAllMocks();
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
        list: [makeForecastEntry({ dt_txt: '2026-02-01 12:00:00' })],
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
            dt_txt: '2026-01-01 09:00:00',
            temp: 18,
            pop: 0.2,
          }),
          makeForecastEntry({
            dt_txt: '2026-01-01 12:00:00',
            temp: 25,
            humidity: 60,
            pop: 0.5,
          }),
          makeForecastEntry({
            dt_txt: '2026-01-01 15:00:00',
            temp: 22,
            pop: 0.1,
          }),
        ],
      }),
    );

    expect(await fetchOwmWeather(geo, '2026-01-01', API_KEY)).toEqual({
      status: 'success',
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

  it('falls back to the middle entry when no 12:00 entry exists', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, {
        list: [
          makeForecastEntry({
            dt_txt: '2026-01-01 09:00:00',
            humidity: 40,
            description: 'clear sky',
          }),
          makeForecastEntry({
            dt_txt: '2026-01-01 15:00:00',
            humidity: 70,
            description: 'light rain',
          }),
          makeForecastEntry({
            dt_txt: '2026-01-01 18:00:00',
            humidity: 90,
            description: 'overcast clouds',
          }),
        ],
      }),
    );

    const result = await fetchOwmWeather(geo, '2026-01-01', API_KEY);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.humidity).toBe(70);
      expect(result.data.description).toBe('light rain');
    }
  });

  it('defaults pop to 0 when an entry omits the pop field', async () => {
    const entryWithoutPop = {
      dt_txt: '2026-01-01 12:00:00',
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
