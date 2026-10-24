import { useEffect, useState } from 'react';

import {
  getMapsStatusOnce,
  toMapsAvailability,
  type MapsAvailability,
} from '@/utils/mapsApi';

const UNAVAILABLE: MapsAvailability = { state: 'unavailable' };

/**
 * Availability of the map feature. Starts as `unavailable` until the shared,
 * fetched-once status request resolves.
 */
export function useMapsStatus(): MapsAvailability {
  const [availability, setAvailability] =
    useState<MapsAvailability>(UNAVAILABLE);

  useEffect(() => {
    let active = true;
    void getMapsStatusOnce().then(status => {
      if (active) {
        setAvailability(toMapsAvailability(status));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return availability;
}
