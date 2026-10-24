import { useEffect, useMemo, useState } from 'react';

import type { DayPlan } from '@/types';
import {
  needsGeoResolution,
  resolveDayGeo,
  withResolvedGeo,
} from '@/utils/mapsApi/geoCache';

interface GeoState {
  resolving: boolean;
  /** Today's name lookups ran out, so some attractions may stay unlocated. */
  geocodeExhausted: boolean;
  /** The last resolve request failed; only already known locations show. */
  failed: boolean;
}

export interface TripGeo extends GeoState {
  /** The days with every attraction's resolved location filled in. */
  days: DayPlan[];
}

const IDLE: GeoState = {
  resolving: false,
  geocodeExhausted: false,
  failed: false,
};

/**
 * Keeps a trip's attraction locations resolved for the map. While any
 * attraction lacks one, asks the backend once per selected day (cached for
 * the page session) to fill the gaps, and returns the days with those results
 * merged in. Does nothing when everything is already resolved.
 *
 * @param tripId - The trip being mapped.
 * @param days - The trip's days as loaded on the page.
 * @param activeDayId - The selected day, the only one allowed to trigger name lookups.
 */
export function useTripGeo(
  tripId: number,
  days: DayPlan[],
  activeDayId: number | undefined,
): TripGeo {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<GeoState>(IDLE);

  useEffect(() => {
    if (activeDayId === undefined || !needsGeoResolution(days)) {
      return;
    }
    let active = true;
    setState(prev => ({ ...prev, resolving: true, failed: false }));
    resolveDayGeo(tripId, activeDayId, days)
      .then(result => {
        if (!active) {
          return;
        }
        setVersion(v => v + 1);
        setState(prev => ({
          resolving: false,
          failed: false,
          geocodeExhausted: result?.geocodeExhausted ?? prev.geocodeExhausted,
        }));
      })
      .catch(() => {
        if (active) {
          setState(prev => ({ ...prev, resolving: false, failed: true }));
        }
      });
    return () => {
      active = false;
    };
  }, [tripId, activeDayId, days]);

  // `version` changes whenever new results land in the session cache.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedDays = useMemo(() => withResolvedGeo(days), [days, version]);

  return { ...state, days: resolvedDays };
}
