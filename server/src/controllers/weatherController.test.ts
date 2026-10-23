import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';
import { getDailyWeather, isWeatherEnabled } from '../weather/weatherService';

import { getWeather, getWeatherStatus } from './weatherController';

vi.mock('../weather/weatherService', () => ({
  getDailyWeather: vi.fn(),
  isWeatherEnabled: vi.fn(),
}));

const VALID_QUERY = { location: 'Tokyo', date: '2026-08-20', days: '3' };

beforeEach(() => {
  vi.mocked(isWeatherEnabled).mockReturnValue(true);
});

describe('weatherController', () => {
  describe('getWeatherStatus', () => {
    it.each([true, false])('responds with enabled=%s', enabled => {
      vi.mocked(isWeatherEnabled).mockReturnValue(enabled);
      const { req, res } = createMockReqRes();

      getWeatherStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({ enabled });
    });
  });

  describe('getWeather', () => {
    it.each([
      {
        name: 'location is missing',
        query: { ...VALID_QUERY, location: undefined },
        error: 'Invalid location parameter',
      },
      {
        name: 'location is blank',
        query: { ...VALID_QUERY, location: '   ' },
        error: 'Invalid location parameter',
      },
      {
        name: 'location is too long',
        query: { ...VALID_QUERY, location: 'x'.repeat(101) },
        error: 'Invalid location parameter',
      },
      {
        name: 'date is missing',
        query: { ...VALID_QUERY, date: undefined },
        error: 'Invalid date parameter',
      },
      {
        name: 'date is malformed',
        query: { ...VALID_QUERY, date: '2026/08/20' },
        error: 'Invalid date parameter',
      },
      {
        name: 'days is missing',
        query: { ...VALID_QUERY, days: undefined },
        error: 'Invalid days parameter',
      },
      {
        name: 'days is not an integer',
        query: { ...VALID_QUERY, days: '1.5' },
        error: 'Invalid days parameter',
      },
    ])('returns 400 when $name', async ({ query, error }) => {
      const { req, res } = createMockReqRes({ query });

      await getWeather(req, res);

      expectJsonStatus(res, 400, { error });
      expect(getDailyWeather).not.toHaveBeenCalled();
    });

    it('responds with error without a lookup when weather is disabled', async () => {
      vi.mocked(isWeatherEnabled).mockReturnValue(false);
      const { req, res } = createMockReqRes({ query: VALID_QUERY });

      await getWeather(req, res);

      expect(res.json).toHaveBeenCalledWith({ status: 'error' });
      expect(getDailyWeather).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'a future date', days: '3', expectedDays: 3 },
      { name: 'a past date', days: '-2', expectedDays: -2 },
    ])(
      'responds with the lookup result for $name',
      async ({ days, expectedDays }) => {
        const result = { status: 'out_of_range' as const };
        vi.mocked(getDailyWeather).mockResolvedValue(result);
        const { req, res } = createMockReqRes({
          query: { ...VALID_QUERY, location: '  東京 ', days },
        });

        await getWeather(req, res);

        expect(getDailyWeather).toHaveBeenCalledWith(
          '東京',
          '2026-08-20',
          expectedDays,
        );
        expect(res.json).toHaveBeenCalledWith(result);
        expect(res.status).not.toHaveBeenCalled();
      },
    );
  });
});
