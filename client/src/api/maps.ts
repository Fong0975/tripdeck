import { api } from './client';

/** Availability of the map feature as reported by the backend. */
export interface MapsStatus {
  /** A browser key is configured. */
  enabled: boolean;
  /** Today's map loads are used up (or Google rejected the key). */
  exhausted: boolean;
  /** Today's name lookups are used up; existing coordinates still work. */
  geocodeExhausted: boolean;
  /** When the daily counters reset (US Pacific midnight), ISO 8601. */
  resetAt: string | null;
}

export async function getMapsStatus(): Promise<MapsStatus> {
  return api<MapsStatus>('/api/maps/status');
}
