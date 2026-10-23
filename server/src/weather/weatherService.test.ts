import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WeatherResult } from './types';

interface LoadConfig {
  owmKey?: string;
  vcKey?: string;
}

const GEO = { lat: 35, lon: 139, resolvedName: 'Tokyo' };

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

/** Loads a fresh module instance so each test starts with an empty cache. */
async function loadService(config: LoadConfig = {}) {
  vi.resetModules();
  const fetchOwmWeather = vi.fn();
  const geocode = vi.fn();
  const fetchVcWeather = vi.fn();

  vi.doMock('../logger', () => ({
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  }));
  vi.doMock('./config', () => ({
    getWeatherKeys: () => ({
      owmKey: config.owmKey ?? '',
      vcKey: config.vcKey ?? '',
    }),
  }));
  vi.doMock('./openWeatherMap', () => ({ fetchOwmWeather, geocode }));
  vi.doMock('./visualCrossing', () => ({ fetchVcWeather }));

  const mod = await import('./weatherService');
  return { ...mod, fetchOwmWeather, geocode, fetchVcWeather };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('isWeatherEnabled', () => {
  it.each([
    {
      description: 'only the OWM key is set',
      owmKey: 'owm',
      vcKey: '',
      expected: true,
    },
    {
      description: 'only the VC key is set',
      owmKey: '',
      vcKey: 'vc',
      expected: true,
    },
    {
      description: 'both keys are set',
      owmKey: 'owm',
      vcKey: 'vc',
      expected: true,
    },
    {
      description: 'neither key is set',
      owmKey: '',
      vcKey: '',
      expected: false,
    },
  ])('is $expected when $description', async ({ owmKey, vcKey, expected }) => {
    const service = await loadService({ owmKey, vcKey });

    expect(service.isWeatherEnabled()).toBe(expected);
  });
});

describe('getDailyWeather', () => {
  it.each([
    {
      description: 'neither provider key is configured',
      config: {},
      days: 0,
      expected: { status: 'error' },
    },
    {
      description:
        'OWM is the only key and the date is beyond its forecast range',
      config: { owmKey: 'owm' },
      days: 5,
      expected: { status: 'out_of_range' },
    },
  ])(
    'returns $expected.status without calling a provider when $description',
    async ({ config, days, expected }) => {
      const service = await loadService(config);

      const result = await service.getDailyWeather('Tokyo', '2026-08-25', days);

      expect(result).toEqual(expected);
      expect(service.geocode).not.toHaveBeenCalled();
      expect(service.fetchVcWeather).not.toHaveBeenCalled();
    },
  );

  it.each([
    { description: 'geocoding resolves no match', geocodeResult: null },
    {
      description: 'geocoding rejects',
      geocodeResult: new Error('geocode failed'),
    },
  ])(
    'returns not_found when $description with an OWM key present',
    async ({ geocodeResult }) => {
      const service = await loadService({ owmKey: 'owm', vcKey: 'vc' });
      if (geocodeResult instanceof Error) {
        service.geocode.mockRejectedValue(geocodeResult);
      } else {
        service.geocode.mockResolvedValue(geocodeResult);
      }

      const result = await service.getDailyWeather('Nowhere', '2026-08-20', 0);

      expect(result).toEqual({ status: 'not_found' });
      expect(service.fetchOwmWeather).not.toHaveBeenCalled();
      expect(service.fetchVcWeather).not.toHaveBeenCalled();
    },
  );

  it('returns the OWM result on success without calling Visual Crossing', async () => {
    const service = await loadService({ owmKey: 'owm', vcKey: 'vc' });
    service.geocode.mockResolvedValue(GEO);
    service.fetchOwmWeather.mockResolvedValue(SUCCESS);

    const result = await service.getDailyWeather('Tokyo', '2026-08-20', 0);

    expect(result).toEqual(SUCCESS);
    expect(service.geocode).toHaveBeenCalledWith('Tokyo', 'owm');
    expect(service.fetchOwmWeather).toHaveBeenCalledWith(
      GEO,
      '2026-08-20',
      'owm',
    );
    expect(service.fetchVcWeather).not.toHaveBeenCalled();
  });

  it.each([
    {
      description: 'OWM returns an error',
      setupOwm: (fn: ReturnType<typeof vi.fn>) =>
        fn.mockResolvedValue({ status: 'error' }),
      days: 0,
      expectOwmCall: true,
    },
    {
      description: 'OWM rejects',
      setupOwm: (fn: ReturnType<typeof vi.fn>) =>
        fn.mockRejectedValue(new Error('network error')),
      days: 0,
      expectOwmCall: true,
    },
    {
      description: 'the date is beyond the OWM forecast range',
      setupOwm: () => {},
      days: 10,
      expectOwmCall: false,
    },
  ])(
    'falls back to Visual Crossing with the geocoded coordinates when $description',
    async ({ setupOwm, days, expectOwmCall }) => {
      const service = await loadService({ owmKey: 'owm', vcKey: 'vc' });
      service.geocode.mockResolvedValue(GEO);
      setupOwm(service.fetchOwmWeather);
      service.fetchVcWeather.mockResolvedValue(SUCCESS);

      const result = await service.getDailyWeather('Tokyo', '2026-08-20', days);

      expect(result).toEqual(SUCCESS);
      expect(service.fetchOwmWeather).toHaveBeenCalledTimes(
        expectOwmCall ? 1 : 0,
      );
      expect(service.fetchVcWeather).toHaveBeenCalledWith(
        '35,139',
        'Tokyo',
        '2026-08-20',
        'vc',
      );
    },
  );

  it('uses the raw location name for Visual Crossing when no OWM key is configured', async () => {
    const service = await loadService({ vcKey: 'vc' });
    service.fetchVcWeather.mockResolvedValue(SUCCESS);

    await service.getDailyWeather('Osaka', '2026-08-20', 0);

    expect(service.geocode).not.toHaveBeenCalled();
    expect(service.fetchVcWeather).toHaveBeenCalledWith(
      'Osaka',
      'Osaka',
      '2026-08-20',
      'vc',
    );
  });

  it.each([
    {
      description: 'OWM rejects and no VC key is configured',
      config: { owmKey: 'owm' },
    },
    { description: 'Visual Crossing rejects', config: { vcKey: 'vc' } },
  ])('returns error when $description', async ({ config }) => {
    const service = await loadService(config);
    service.geocode.mockResolvedValue(GEO);
    service.fetchOwmWeather.mockRejectedValue(new Error('network error'));
    service.fetchVcWeather.mockRejectedValue(new Error('network error'));

    const result = await service.getDailyWeather('Tokyo', '2026-08-20', 0);

    expect(result).toEqual({ status: 'error' });
  });
});

describe('getDailyWeather cache', () => {
  it.each([
    {
      description: 'serves a fresh non-error result from cache',
      owmResult: SUCCESS,
      secondCall: { location: 'Tokyo', date: '2026-08-20' },
      advanceMs: 0,
      expectedLookups: 1,
    },
    {
      description: 'caches not_found results too',
      owmResult: { status: 'not_found' },
      secondCall: { location: 'Tokyo', date: '2026-08-20' },
      advanceMs: 0,
      expectedLookups: 1,
    },
    {
      description: 'does not cache error results',
      owmResult: { status: 'error' },
      secondCall: { location: 'Tokyo', date: '2026-08-20' },
      advanceMs: 0,
      expectedLookups: 2,
    },
    {
      description: 'uses a separate entry for a different date',
      owmResult: SUCCESS,
      secondCall: { location: 'Tokyo', date: '2026-08-21' },
      advanceMs: 0,
      expectedLookups: 2,
    },
    {
      description: 'refetches once the entry has expired',
      owmResult: SUCCESS,
      secondCall: { location: 'Tokyo', date: '2026-08-20' },
      advanceMs: 60 * 60 * 1000,
      expectedLookups: 2,
    },
  ])(
    '$description',
    async ({ owmResult, secondCall, advanceMs, expectedLookups }) => {
      vi.useFakeTimers();
      const service = await loadService({ owmKey: 'owm' });
      service.geocode.mockResolvedValue(GEO);
      service.fetchOwmWeather.mockResolvedValue(owmResult);

      await service.getDailyWeather('Tokyo', '2026-08-20', 0);
      vi.advanceTimersByTime(advanceMs);
      await service.getDailyWeather(secondCall.location, secondCall.date, 0);

      expect(service.fetchOwmWeather).toHaveBeenCalledTimes(expectedLookups);
    },
  );

  it('evicts the oldest entry once the cache is full', async () => {
    const service = await loadService({ owmKey: 'owm' });
    service.geocode.mockResolvedValue(GEO);
    service.fetchOwmWeather.mockResolvedValue(SUCCESS);

    for (let i = 0; i < service.CACHE_MAX_ENTRIES; i++) {
      await service.getDailyWeather(`place-${i}`, '2026-08-20', 0);
    }
    await service.getDailyWeather('one-more', '2026-08-20', 0);
    service.fetchOwmWeather.mockClear();

    await service.getDailyWeather('place-1', '2026-08-20', 0);
    expect(service.fetchOwmWeather).not.toHaveBeenCalled();

    await service.getDailyWeather('place-0', '2026-08-20', 0);
    expect(service.fetchOwmWeather).toHaveBeenCalledTimes(1);
  });
});
