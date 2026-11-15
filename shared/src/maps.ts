import type { GeoSource } from './constants';

/** Response of `GET /api/maps/status`: availability of the map feature. */
export interface MapsStatus {
  /** A browser key is configured. */
  enabled: boolean;
  /** Today's map loads are used up (or Google rejected the key). */
  exhausted: boolean;
  /** Today's name lookups are used up; existing coordinates still work. */
  geocodeExhausted: boolean;
  /** When the daily counters reset (US Pacific midnight), ISO 8601; null when disabled. */
  resetAt: string | null;
}

/** Response of `GET /api/maps/config`; each successful call counts as one map load. */
export interface MapsConfig {
  apiKey: string;
}

/** Body of the 429 response of `GET /api/maps/config`. */
export interface MapsQuotaErrorBody {
  error: string;
  /** When the daily quota resets, ISO 8601. */
  resetAt: string;
}

/** Request body of `POST /api/maps/resolve`. */
export interface ResolveGeoBody {
  tripId: number;
  /** The only day whose gaps may trigger a billable name lookup. */
  dayId: number;
}

/** One attraction's location as resolved by the server. */
export interface ResolvedAttractionGeo {
  id: number;
  latitude: number | null;
  longitude: number | null;
  geoSource: GeoSource | null;
}

/** Response of `POST /api/maps/resolve`. */
export interface ResolveGeoResult {
  attractions: ResolvedAttractionGeo[];
  /** Today's name lookups ran out while resolving. */
  geocodeExhausted: boolean;
}

/** Reasons the client may report a Google Maps failure for. */
export type MapsErrorReason = 'auth_failure';

/** Request body of `POST /api/maps/report-error`. */
export interface MapsErrorReportBody {
  reason: MapsErrorReason;
}
