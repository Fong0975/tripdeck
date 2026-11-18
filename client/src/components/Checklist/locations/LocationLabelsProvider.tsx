import type { LocationLabel } from '@tripdeck/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getLocationLabels } from '@/utils/storage';

import { LocationLabelsContext } from './LocationLabelsContext';
import { buildLabelSet, DEFAULT_LABELS } from './locationLabelSet';

/**
 * Loads the location labels once and shares them with every checklist view
 * and editor below it. Until they load, or if loading fails, the default
 * labels are used.
 */
export function LocationLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<LocationLabel[]>(DEFAULT_LABELS);

  const reload = useCallback(async () => {
    try {
      const response = await getLocationLabels();
      setLabels(response.labels);
    } catch {
      // Keep the labels already shown; the server still validates writes.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void reload();
  }, [reload]);

  const value = useMemo(() => buildLabelSet(labels, reload), [labels, reload]);

  return (
    <LocationLabelsContext.Provider value={value}>
      {children}
    </LocationLabelsContext.Provider>
  );
}
