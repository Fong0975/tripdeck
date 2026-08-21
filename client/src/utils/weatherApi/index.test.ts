import { beforeEach, describe, expect, it, vi } from 'vitest';

interface LoadConfig {
  owmKey?: string;
  vcKey?: string;
  daysFromToday?: number;
}

async function loadWeatherApi(config: LoadConfig = {}) {
  vi.resetModules();
  const daysFromToday = vi.fn().mockReturnValue(config.daysFromToday ?? 0);
  const fetchOwmWeather = vi.fn();
  const geocode = vi.fn();
  const fetchVcWeather = vi.fn();

  vi.doMock('@/utils/date', () => ({ daysFromToday }));
  vi.doMock('./openWeatherMap', () => ({
    OWM_KEY: config.owmKey ?? '',
    fetchOwmWeather,
    geocode,
  }));
  vi.doMock('./visualCrossing', () => ({
    VC_KEY: config.vcKey ?? '',
    fetchVcWeather,
  }));

  const mod = await import('./index');
  return { ...mod, daysFromToday, fetchOwmWeather, geocode, fetchVcWeather };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('isWeatherEnabled', () => {
  it.each([
    { description: 'only the OWM key is set', owmKey: 'owm', vcKey: '' },
    { description: 'only the VC key is set', owmKey: '', vcKey: 'vc' },
    { description: 'both keys are set', owmKey: 'owm', vcKey: 'vc' },
  ])('is true when $description', async ({ owmKey, vcKey }) => {
    const api = await loadWeatherApi({ owmKey, vcKey });

    expect(api.isWeatherEnabled).toBe(true);
  });

  it('is false when neither key is set', async () => {
    const api = await loadWeatherApi({ owmKey: '', vcKey: '' });

    expect(api.isWeatherEnabled).toBe(false);
  });
});

describe('fetchDailyWeather', () => {
  it('returns error when neither provider key is configured', async () => {
    const api = await loadWeatherApi({ owmKey: '', vcKey: '' });

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual({ status: 'error' });
  });

  it('returns out_of_range when OWM is the only key and the date is beyond its forecast range', async () => {
    const api = await loadWeatherApi({
      owmKey: 'owm',
      vcKey: '',
      daysFromToday: 5,
    });

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-25');

    expect(result).toEqual({ status: 'out_of_range' });
    expect(api.geocode).not.toHaveBeenCalled();
  });

  it('returns not_found when geocoding fails with an OWM key present', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: '' });
    api.geocode.mockRejectedValue(new Error('geocode failed'));

    const result = await api.fetchDailyWeather('Nowhere', '2026-08-20');

    expect(result).toEqual({ status: 'not_found' });
    expect(api.fetchOwmWeather).not.toHaveBeenCalled();
  });

  it('returns the OWM result on success without calling Visual Crossing', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: 'vc' });
    const geo = { lat: 35, lon: 139, resolvedName: 'Tokyo' };
    api.geocode.mockResolvedValue(geo);
    const success = {
      status: 'success' as const,
      data: {
        resolvedName: 'Tokyo',
        icon: 'clear' as const,
        description: 'Clear',
        tempMin: 20,
        tempMax: 28,
        humidity: 50,
        pop: 0,
      },
    };
    api.fetchOwmWeather.mockResolvedValue(success);

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual(success);
    expect(api.fetchVcWeather).not.toHaveBeenCalled();
  });

  it('falls back to Visual Crossing when OWM fails but a VC key is present', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: 'vc' });
    const geo = { lat: 35, lon: 139, resolvedName: 'Tokyo' };
    api.geocode.mockResolvedValue(geo);
    api.fetchOwmWeather.mockResolvedValue({ status: 'error' });
    const success = {
      status: 'success' as const,
      data: {
        resolvedName: 'Tokyo',
        icon: 'rain' as const,
        description: 'Rain',
        tempMin: 18,
        tempMax: 22,
        humidity: 80,
        pop: 60,
      },
    };
    api.fetchVcWeather.mockResolvedValue(success);

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual(success);
    expect(api.fetchVcWeather).toHaveBeenCalledWith(
      '35,139',
      'Tokyo',
      '2026-08-20',
    );
  });

  it('uses the raw location name for Visual Crossing when no OWM key is configured', async () => {
    const api = await loadWeatherApi({ owmKey: '', vcKey: 'vc' });
    api.fetchVcWeather.mockResolvedValue({ status: 'error' });

    await api.fetchDailyWeather('Osaka', '2026-08-20');

    expect(api.geocode).not.toHaveBeenCalled();
    expect(api.fetchVcWeather).toHaveBeenCalledWith(
      'Osaka',
      'Osaka',
      '2026-08-20',
    );
  });

  it('caches a result by location and date so a second call does not refetch', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: '' });
    api.geocode.mockResolvedValue({ lat: 1, lon: 2, resolvedName: 'Tokyo' });
    api.fetchOwmWeather.mockResolvedValue({ status: 'error' });

    await api.fetchDailyWeather('Tokyo', '2026-08-20');
    await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(api.geocode).toHaveBeenCalledTimes(1);
    expect(api.fetchOwmWeather).toHaveBeenCalledTimes(1);
  });

  it('uses a separate cache entry for a different date', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: '' });
    api.geocode.mockResolvedValue({ lat: 1, lon: 2, resolvedName: 'Tokyo' });
    api.fetchOwmWeather.mockResolvedValue({ status: 'error' });

    await api.fetchDailyWeather('Tokyo', '2026-08-20');
    await api.fetchDailyWeather('Tokyo', '2026-08-21');

    expect(api.geocode).toHaveBeenCalledTimes(2);
  });

  it('falls back to error status when fetchOwmWeather rejects and no VC key is configured', async () => {
    const api = await loadWeatherApi({ owmKey: 'owm', vcKey: '' });
    const geo = { lat: 35, lon: 139, resolvedName: 'Tokyo' };
    api.geocode.mockResolvedValue(geo);
    api.fetchOwmWeather.mockRejectedValue(new Error('network error'));

    const result = await api.fetchDailyWeather('Tokyo', '2026-08-20');

    expect(result).toEqual({ status: 'error' });
  });

  it('falls back to error status when fetchVcWeather rejects', async () => {
    const api = await loadWeatherApi({ owmKey: '', vcKey: 'vc' });
    api.fetchVcWeather.mockRejectedValue(new Error('network error'));

    const result = await api.fetchDailyWeather('Osaka', '2026-08-20');

    expect(result).toEqual({ status: 'error' });
  });
});
