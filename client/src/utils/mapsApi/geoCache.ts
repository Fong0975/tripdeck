import { resolveTripGeo, type ResolveGeoResult } from '@/api/maps';
import type { Attraction, DayPlan } from '@/types';

type GeoFields = Pick<Attraction, 'latitude' | 'longitude' | 'geoSource'>;
type GeoInput = Pick<Attraction, 'id' | 'name' | 'googleMapUrl'>;

interface CachedGeo {
  inputKey: string;
  geo: GeoFields;
}

// Session-long results keyed by attraction id. Each entry remembers the name
// and link it was resolved for, so editing either makes it stale on its own.
const cache = new Map<number, CachedGeo>();
const done = new Set<string>();
const inFlight = new Map<string, Promise<ResolveGeoResult>>();

function inputKeyOf(attraction: GeoInput): string {
  return `${attraction.name}\u0000${attraction.googleMapUrl ?? ''}`;
}

function overlay(attraction: Attraction): Attraction {
  const cached = cache.get(attraction.id);
  return cached && cached.inputKey === inputKeyOf(attraction)
    ? { ...attraction, ...cached.geo }
    : attraction;
}

/** Returns the days with every attraction's location overlaid from this session's resolved results. */
export function withResolvedGeo(days: DayPlan[]): DayPlan[] {
  return days.map(day => ({
    ...day,
    attractions: day.attractions.map(overlay),
  }));
}

/** Whether any attraction still has no resolved location (a not-found marker counts as resolved). */
export function needsGeoResolution(days: DayPlan[]): boolean {
  return days.some(day =>
    day.attractions.some(attraction => !overlay(attraction).geoSource),
  );
}

/**
 * Asks the backend to resolve a trip's missing locations, geocoding only
 * `dayId`'s gaps, at most once per day and set of attraction names and links
 * for the page session. Concurrent calls share one request.
 *
 * @returns The backend result, or null when this exact request already ran.
 */
export async function resolveDayGeo(
  tripId: number,
  dayId: number,
  days: DayPlan[],
): Promise<ResolveGeoResult | null> {
  const attractions = days.flatMap(day => day.attractions);
  const key = [
    tripId,
    dayId,
    ...attractions.map(a => `${a.id}=${inputKeyOf(a)}`),
  ].join('|');
  if (done.has(key)) {
    return null;
  }
  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const request = resolveTripGeo(tripId, dayId)
    .then(result => {
      const byId = new Map(attractions.map(a => [a.id, a]));
      for (const resolved of result.attractions) {
        const attraction = byId.get(resolved.id);
        if (attraction && resolved.geoSource) {
          cache.set(resolved.id, {
            inputKey: inputKeyOf(attraction),
            geo: {
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              geoSource: resolved.geoSource,
            },
          });
        }
      }
      done.add(key);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/** Test-only: clears the session cache so each test starts clean. */
export function __resetGeoCacheForTests(): void {
  cache.clear();
  done.clear();
  inFlight.clear();
}
