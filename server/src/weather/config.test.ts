import { beforeEach, describe, expect, it, vi } from 'vitest';

const readSecretOrEmpty = vi.hoisted(() => vi.fn());
vi.mock('../config/secrets', () => ({ readSecretOrEmpty }));

import { __resetKeysForTests, getWeatherKeys } from './config';

beforeEach(() => {
  readSecretOrEmpty.mockReset();
  readSecretOrEmpty.mockImplementation((key: string) => `value-of-${key}`);
  __resetKeysForTests();
});

describe('getWeatherKeys', () => {
  it('reads both keys through the secret loader', () => {
    expect(getWeatherKeys()).toEqual({
      owmKey: 'value-of-OWM_API_KEY',
      vcKey: 'value-of-VC_API_KEY',
    });
  });

  it('reads the secrets only once per process', () => {
    getWeatherKeys();
    getWeatherKeys();

    expect(readSecretOrEmpty).toHaveBeenCalledTimes(2);
  });
});
