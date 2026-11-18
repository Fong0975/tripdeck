import { useMemo } from 'react';

import type { ChecklistCategory, ChecklistOccasion } from '@/types';

import { getCheckUnits, type CheckGetter } from './checkUnits';
import {
  createUnfinishedVisibility,
  unitKeyOf,
  type UnitVisibility,
} from './incompleteFilter';
import { useLingeringKeys } from './useLingeringKeys';

/** How long a unit that was just finished stays visible. */
export const FINISHED_LINGER_MS = 3000;

type ToggleHandler = (occId: number, id: number, location: string) => void;

const NO_OCCASIONS: ChecklistOccasion[] = [];

interface Options {
  /** Whether only unfinished units are shown. */
  enabled: boolean;
  occasions?: ChecklistOccasion[];
  categories?: ChecklistCategory[];
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: ToggleHandler;
  onToggleSpecCheck: ToggleHandler;
}

interface IncompleteOnly {
  /** Visibility rule of a unit; undefined while every unit is shown. */
  isUnitVisible: UnitVisibility | undefined;
  /** True when the view is on, the checklist has units and none is left. */
  allFinished: boolean;
  /** Toggle handlers that keep a just finished unit visible for a while. */
  toggleCheck: ToggleHandler;
  toggleSpecCheck: ToggleHandler;
}

/**
 * Drives the "unfinished only" view. A unit that a check finishes stays
 * visible for {@link FINISHED_LINGER_MS} before it disappears, and stays for
 * good when it is toggled back to unfinished in the meantime.
 */
export function useIncompleteOnly({
  enabled,
  occasions = NO_OCCASIONS,
  categories,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
}: Options): IncompleteOnly {
  const lingering = useLingeringKeys(FINISHED_LINGER_MS);

  const isUnitVisible = useMemo(
    () =>
      enabled
        ? createUnfinishedVisibility(
            occasions,
            getCheck,
            getSpecCheck,
            lingering.keys,
          )
        : undefined,
    [enabled, occasions, getCheck, getSpecCheck, lingering.keys],
  );

  const allFinished =
    isUnitVisible !== undefined &&
    categories !== undefined &&
    getCheckUnits(categories).length > 0 &&
    !getCheckUnits(categories).some(isUnitVisible);

  const wrap =
    (
      kind: 'item' | 'spec',
      read: CheckGetter,
      toggle: ToggleHandler,
    ): ToggleHandler =>
    (occId, id, location) => {
      if (enabled) {
        const finishedAfter =
          occasions.length > 0 &&
          occasions.every(occ =>
            occ.id === occId
              ? !read(occId, id, location)
              : read(occ.id, id, location),
          );
        const key = unitKeyOf(kind, id, location);
        if (finishedAfter) {
          lingering.hold(key);
        } else {
          lingering.release(key);
        }
      }
      toggle(occId, id, location);
    };

  return {
    isUnitVisible,
    allFinished,
    toggleCheck: wrap('item', getCheck, onToggleCheck),
    toggleSpecCheck: wrap('spec', getSpecCheck, onToggleSpecCheck),
  };
}
