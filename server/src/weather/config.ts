import { readSecretOrEmpty } from '../config/secrets';
import { createLogger } from '../logger';

const logger = createLogger('weather');

export interface WeatherKeys {
  owmKey: string;
  vcKey: string;
}

let cachedKeys: WeatherKeys | null = null;

/**
 * Returns the OpenWeatherMap and Visual Crossing API keys (Docker secret file
 * first, then the plain env var). They are read once and cached for the life
 * of the process; an empty key disables that provider.
 */
export function getWeatherKeys(): WeatherKeys {
  cachedKeys ??= {
    owmKey: readSecretOrEmpty('OWM_API_KEY', logger),
    vcKey: readSecretOrEmpty('VC_API_KEY', logger),
  };
  return cachedKeys;
}

/** Test-only: drops the cached keys so the next lookup re-reads the secrets. */
export function __resetKeysForTests(): void {
  cachedKeys = null;
}
