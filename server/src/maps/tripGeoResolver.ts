import { createLogger } from '../logger';
import {
  type AttractionGeoRow,
  findGeoRowsForTrip,
  type GeoUpdate,
  saveGeo,
} from '../repositories/attraction/attractionGeo';

import { getMapsConfig, isGeocodingEnabled } from './config';
import { geocodeByName, MapsQuotaError } from './geocodeClient';
import { computeGeoKey, type GeoSource } from './geoKey';
import { resolveCoordinatesFromLink } from './linkResolver';
import { mapWithConcurrency } from './mapWithConcurrency';
import { createSerialQueue } from './serialQueue';
import { getUsage, markExhausted, tryConsume } from './usageTracker';

const logger = createLogger('maps');

/** Upper bound of billable Geocoding calls a single resolve request may make. */
export const MAX_GEOCODES_PER_REQUEST = 20;
const LINK_CONCURRENCY = 3;
const GEOCODE_MIN_INTERVAL_MS = 200;

const geocodeQueue = createSerialQueue({
  minIntervalMs: GEOCODE_MIN_INTERVAL_MS,
});

type ResolvedGeo = Omit<GeoUpdate, 'geoKey'>;

export interface ResolvedAttractionGeo {
  id: number;
  latitude: number | null;
  longitude: number | null;
  geoSource: GeoSource | null;
}

export interface TripGeoResult {
  attractions: ResolvedAttractionGeo[];
  geocodeExhausted: boolean;
}

function currentKey(row: AttractionGeoRow): string {
  return computeGeoKey(row.name, row.google_map_url);
}

/** A row is resolved when stored coordinates (or a not-found marker) match its current name and link. */
function isResolved(row: AttractionGeoRow): boolean {
  return row.geo_source !== null && row.geo_key === currentKey(row);
}

async function store(
  row: AttractionGeoRow,
  geo: ResolvedGeo,
): Promise<boolean> {
  const geoKey = currentKey(row);
  const saved = await saveGeo(row, { ...geo, geoKey });
  if (saved) {
    row.latitude = geo.latitude;
    row.longitude = geo.longitude;
    row.geo_source = geo.geoSource;
    row.geo_key = geoKey;
  }
  return saved;
}

function toResult(row: AttractionGeoRow): ResolvedAttractionGeo {
  if (!isResolved(row)) {
    return { id: row.id, latitude: null, longitude: null, geoSource: null };
  }
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    geoSource: row.geo_source,
  };
}

/**
 * Fills in missing coordinates for a trip, spending as little Google quota as
 * possible. In order:
 *  1. rows sharing a name and link with an already resolved row copy its result;
 *  2. every day's rows are resolved from their Google Maps link (free);
 *  3. only the requested day's remaining rows are geocoded by name, one
 *     billable call each, capped per request, serialized with a minimum
 *     spacing, and stopped as soon as the daily quota is gone or Google
 *     rejects a call.
 * Results, including "not found", are written to the database, so a given
 * name and link is looked up at most once.
 *
 * @param tripId - Trip whose attractions are resolved.
 * @param dayId - Day whose unresolved attractions may be geocoded.
 * @returns Every attraction's location (null while unresolved) and whether
 *   the geocode quota is used up.
 */
export async function resolveTripGeo(
  tripId: number,
  dayId: number,
): Promise<TripGeoResult> {
  const rows = await findGeoRowsForTrip(tripId);
  const unresolved = () => rows.filter(row => !isResolved(row));

  const known = new Map<string, ResolvedGeo>();
  for (const row of rows) {
    if (isResolved(row)) {
      known.set(currentKey(row), {
        latitude: row.latitude,
        longitude: row.longitude,
        geoSource: row.geo_source as GeoSource,
      });
    }
  }

  for (const row of unresolved()) {
    const sibling = known.get(currentKey(row));
    if (sibling) {
      await store(row, sibling);
    }
  }

  await mapWithConcurrency(unresolved(), LINK_CONCURRENCY, async row => {
    try {
      const coordinates = await resolveCoordinatesFromLink(row.google_map_url);
      if (!coordinates) {
        return;
      }
      const geo: ResolvedGeo = {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        geoSource: 'url',
      };
      if (await store(row, geo)) {
        known.set(currentKey(row), geo);
      }
    } catch (err) {
      logger.error('Failed to resolve an attraction link', { id: row.id }, err);
    }
  });

  let geocodeExhausted = false;
  if (isGeocodingEnabled()) {
    let remaining = MAX_GEOCODES_PER_REQUEST;
    for (const row of unresolved().filter(r => r.trip_day_id === dayId)) {
      const key = currentKey(row);
      const sibling = known.get(key);
      if (sibling) {
        await store(row, sibling);
        continue;
      }
      if (remaining === 0) {
        break;
      }
      if (!(await tryConsume('geocode'))) {
        geocodeExhausted = true;
        break;
      }
      remaining--;

      try {
        const coordinates = await geocodeQueue.enqueue(key, () =>
          geocodeByName(row.name, getMapsConfig().serverKey),
        );
        const geo: ResolvedGeo = coordinates
          ? {
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              geoSource: 'geocode',
            }
          : { latitude: null, longitude: null, geoSource: 'not_found' };
        if (await store(row, geo)) {
          known.set(key, geo);
        }
      } catch (err) {
        if (err instanceof MapsQuotaError) {
          await markExhausted('geocode');
          geocodeExhausted = true;
          logger.warn('Google reported the geocoding quota as used up');
        } else {
          logger.error(
            'Geocoding failed; stopping this batch',
            { id: row.id },
            err,
          );
        }
        break;
      }
    }
    geocodeExhausted ||= (await getUsage('geocode')).exhausted;
  }

  return { attractions: rows.map(toResult), geocodeExhausted };
}
