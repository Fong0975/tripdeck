import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const secrets = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock('../config/secrets', () => ({
  readSecretOrEmpty: (key: string) => secrets.values[key] ?? '',
}));

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { mockLogger } from '../test-utils/loggerMock';

import {
  __resetMapsConfigForTests,
  getMapsConfig,
  isGeocodingEnabled,
  isMapsEnabled,
} from './config';

describe('maps config', () => {
  beforeEach(() => {
    secrets.values = {};
    __resetMapsConfigForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('keys', () => {
    it.each([
      {
        description: 'separate browser and server keys',
        values: {
          GOOGLE_MAPS_BROWSER_KEY: 'browser',
          GOOGLE_MAPS_SERVER_KEY: 'server',
        },
        expected: { browserKey: 'browser', serverKey: 'server' },
        maps: true,
        geocoding: true,
        warns: 0,
      },
      {
        description: 'only the browser key (shared demo key)',
        values: { GOOGLE_MAPS_BROWSER_KEY: 'demo' },
        expected: { browserKey: 'demo', serverKey: 'demo' },
        maps: true,
        geocoding: true,
        warns: 1,
      },
      {
        description: 'only the server key',
        values: { GOOGLE_MAPS_SERVER_KEY: 'server' },
        expected: { browserKey: '', serverKey: 'server' },
        maps: false,
        geocoding: true,
        warns: 0,
      },
      {
        description: 'no keys',
        values: {},
        expected: { browserKey: '', serverKey: '' },
        maps: false,
        geocoding: false,
        warns: 0,
      },
    ])(
      'resolves $description',
      ({ values, expected, maps, geocoding, warns }) => {
        secrets.values = values;

        expect(getMapsConfig()).toMatchObject(expected);
        expect(isMapsEnabled()).toBe(maps);
        expect(isGeocodingEnabled()).toBe(geocoding);
        expect(mockLogger.warn).toHaveBeenCalledTimes(warns);
      },
    );

    it('reads the secrets once and caches the result', () => {
      secrets.values = { GOOGLE_MAPS_BROWSER_KEY: 'first' };
      getMapsConfig();

      secrets.values = { GOOGLE_MAPS_BROWSER_KEY: 'second' };

      expect(getMapsConfig().browserKey).toBe('first');
    });
  });

  describe('daily limits', () => {
    it.each([
      { description: 'unset', value: undefined, expected: 200, warns: 0 },
      { description: 'blank', value: '  ', expected: 200, warns: 0 },
      { description: 'a valid number', value: '50', expected: 50, warns: 0 },
      { description: 'zero', value: '0', expected: 0, warns: 0 },
      { description: 'not a number', value: 'abc', expected: 200, warns: 2 },
      { description: 'negative', value: '-1', expected: 200, warns: 2 },
      { description: 'fractional', value: '1.5', expected: 200, warns: 2 },
    ])('reads $description', ({ value, expected, warns }) => {
      if (value !== undefined) {
        vi.stubEnv('MAPS_DAILY_GEOCODE_LIMIT', value);
        vi.stubEnv('MAPS_DAILY_LOAD_LIMIT', value);
      } else {
        vi.stubEnv('MAPS_DAILY_GEOCODE_LIMIT', undefined);
        vi.stubEnv('MAPS_DAILY_LOAD_LIMIT', undefined);
      }

      expect(getMapsConfig()).toMatchObject({
        geocodeDailyLimit: expected,
        loadDailyLimit: expected,
      });
      expect(mockLogger.warn).toHaveBeenCalledTimes(warns);
    });
  });
});
