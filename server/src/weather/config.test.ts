import { beforeEach, describe, expect, it, vi } from 'vitest';

const readSecretOrEmpty = vi.hoisted(() => vi.fn());
vi.mock('../config/secrets', () => ({ readSecretOrEmpty }));
vi.mock('../logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

async function loadConfig() {
  vi.resetModules();
  return import('./config');
}

beforeEach(() => {
  readSecretOrEmpty.mockReset();
  readSecretOrEmpty.mockImplementation((key: string) => `value-of-${key}`);
});

describe('getWeatherKeys', () => {
  it('reads both keys through the secret loader', async () => {
    const { getWeatherKeys } = await loadConfig();

    expect(getWeatherKeys()).toEqual({
      owmKey: 'value-of-OWM_API_KEY',
      vcKey: 'value-of-VC_API_KEY',
    });
  });

  it('reads the secrets only once per process', async () => {
    const { getWeatherKeys } = await loadConfig();

    getWeatherKeys();
    getWeatherKeys();

    expect(readSecretOrEmpty).toHaveBeenCalledTimes(2);
  });
});
