import { useEffect, useState } from 'react';

import {
  getMapsStatusOnce,
  subscribeMapsStatus,
  toMapsAvailability,
  type MapsAvailability,
} from '@/utils/mapsApi';

const UNAVAILABLE: MapsAvailability = { state: 'unavailable' };

/**
 * Availability of the map feature. Starts as `unavailable` until the shared,
 * fetched-once status request resolves, and follows later changes such as the
 * quota running out while the page is open.
 */
export function useMapsStatus(): MapsAvailability {
  const [availability, setAvailability] =
    useState<MapsAvailability>(UNAVAILABLE);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getMapsStatusOnce().then(status => {
        if (active) {
          setAvailability(toMapsAvailability(status));
        }
      });
    };
    refresh();
    const unsubscribe = subscribeMapsStatus(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return availability;
}
