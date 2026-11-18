import { checkKey } from '@tripdeck/shared';

import type { TripChecklist } from '@/types';

import { getCheckUnits } from './checkUnits';

/**
 * Unsaved check-state edits, keyed by occasion ID then by `checkKey` of the
 * item ID (or spec ID when it holds spec checks) and its location.
 */
export type LocalChecks = Record<number, Record<string, boolean>>;

/**
 * Lists the local edits of one occasion that differ from its saved state.
 *
 * @param local The occasion's unsaved edits, if any.
 * @param saved The occasion's saved checks (only `true` entries are stored).
 * @returns `[key, checked]` pairs whose local value differs from the saved one.
 */
export function changedChecks(
  local: Record<string, boolean> | undefined,
  saved: Record<string, boolean>,
): [key: string, checked: boolean][] {
  return Object.entries(local ?? {}).filter(
    ([key, checked]) => checked !== !!saved[key],
  );
}

function pruneToKnownKeys(
  localChecks: LocalChecks,
  occasionIds: Set<number>,
  knownKeys: Set<string>,
): LocalChecks {
  const pruned: LocalChecks = {};
  for (const [occIdStr, checks] of Object.entries(localChecks)) {
    const occId = Number(occIdStr);
    if (!occasionIds.has(occId)) {
      continue;
    }
    const kept = Object.fromEntries(
      Object.entries(checks).filter(([key]) => knownKeys.has(key)),
    );
    if (Object.keys(kept).length > 0) {
      pruned[occId] = kept;
    }
  }
  return pruned;
}

/**
 * Drops local check edits whose occasion, item or location no longer exists
 * in `checklist` (e.g. after a structure edit removed them), keeping every
 * other edit so unsaved checks survive a checklist reload.
 *
 * @param localChecks The current unsaved item edits.
 * @param checklist The freshly loaded checklist to reconcile against.
 * @returns A new edits map containing only still-valid entries; occasions
 *   left with no edits are omitted.
 */
export function pruneLocalChecks(
  localChecks: LocalChecks,
  checklist: TripChecklist,
): LocalChecks {
  return pruneToKnownKeys(
    localChecks,
    new Set(checklist.occasions.map(o => o.id)),
    new Set(
      getCheckUnits(checklist.categories).flatMap(unit =>
        unit.kind === 'item' ? [checkKey(unit.item.id, unit.location)] : [],
      ),
    ),
  );
}

/**
 * Same as {@link pruneLocalChecks}, for unsaved edits keyed by spec ID.
 *
 * @param localSpecChecks The current unsaved spec edits.
 * @param checklist The freshly loaded checklist to reconcile against.
 */
export function pruneLocalSpecChecks(
  localSpecChecks: LocalChecks,
  checklist: TripChecklist,
): LocalChecks {
  return pruneToKnownKeys(
    localSpecChecks,
    new Set(checklist.occasions.map(o => o.id)),
    new Set(
      getCheckUnits(checklist.categories).flatMap(unit =>
        unit.kind === 'spec' ? [checkKey(unit.spec.id, unit.location)] : [],
      ),
    ),
  );
}
