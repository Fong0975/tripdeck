import { useEffect, useState } from 'react';

import { getWeatherEnabled } from '@/utils/weatherApi';

/**
 * Whether the backend has a weather provider configured. Starts as `false`
 * until the (shared, fetched-once) status request resolves.
 */
export function useWeatherEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void getWeatherEnabled().then(value => {
      if (active) {
        setEnabled(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
