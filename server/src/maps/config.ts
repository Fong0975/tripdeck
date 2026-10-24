import { readSecretOrEmpty } from '../config/secrets';
import { createLogger } from '../logger';

const logger = createLogger('maps');

const DEFAULT_DAILY_LIMIT = 200;

export interface MapsConfig {
  /** Key handed to the browser for the Maps JavaScript API. */
  browserKey: string;
  /** Key used by the backend for Geocoding API calls; never sent to clients. */
  serverKey: string;
  geocodeDailyLimit: number;
  loadDailyLimit: number;
}

let cachedConfig: MapsConfig | null = null;

function readDailyLimit(envName: string): number {
  const raw = process.env[envName]?.trim();
  if (!raw) {
    return DEFAULT_DAILY_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    logger.warn('Ignoring invalid daily limit, using the default', {
      envName,
      default: DEFAULT_DAILY_LIMIT,
    });
    return DEFAULT_DAILY_LIMIT;
  }
  return parsed;
}

/**
 * Returns the Google Maps keys (Docker secret file first, then the plain env
 * var) and the self-imposed daily request limits. Read once and cached for the
 * life of the process.
 *
 * When `GOOGLE_MAPS_SERVER_KEY` is empty the browser key is reused for
 * server-side calls, so a single demo key is enough during development.
 */
export function getMapsConfig(): MapsConfig {
  if (!cachedConfig) {
    const browserKey = readSecretOrEmpty('GOOGLE_MAPS_BROWSER_KEY', logger);
    let serverKey = readSecretOrEmpty('GOOGLE_MAPS_SERVER_KEY', logger);
    if (!serverKey && browserKey) {
      logger.warn(
        'GOOGLE_MAPS_SERVER_KEY is not set; reusing GOOGLE_MAPS_BROWSER_KEY for Geocoding calls',
      );
      serverKey = browserKey;
    }
    cachedConfig = {
      browserKey,
      serverKey,
      geocodeDailyLimit: readDailyLimit('MAPS_DAILY_GEOCODE_LIMIT'),
      loadDailyLimit: readDailyLimit('MAPS_DAILY_LOAD_LIMIT'),
    };
  }
  return cachedConfig;
}

/** The map feature needs the browser key; without it the whole feature is off. */
export function isMapsEnabled(): boolean {
  return getMapsConfig().browserKey !== '';
}

export function isGeocodingEnabled(): boolean {
  return getMapsConfig().serverKey !== '';
}

/** Test-only: drops the cached config so the next call re-reads secrets and env. */
export function __resetMapsConfigForTests(): void {
  cachedConfig = null;
}
