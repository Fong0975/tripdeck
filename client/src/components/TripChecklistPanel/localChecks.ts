import type { TripChecklist } from '@/types';

/**
 * Unsaved check-state edits, keyed by occasion ID then by item ID (or spec ID
 * when it holds spec checks).
 */
export type LocalChecks = Record<number, Record<number, boolean>>;

/**
 * Lists the local edits of one occasion that differ from its saved state.
 *
 * @param local The occasion's unsaved edits, if any.
 * @param saved The occasion's saved checks (only `true` entries are stored).
 * @returns `[id, checked]` pairs whose local value differs from the saved one.
 */
export function changedChecks(
  local: Record<number, boolean> | undefined,
  saved: Record<number, boolean>,
): [id: number, checked: boolean][] {
  return Object.entries(local ?? {})
    .map(([idStr, checked]): [number, boolean] => [Number(idStr), checked])
    .filter(([id, checked]) => checked !== !!saved[id]);
}

function pruneToKnownIds(
  localChecks: LocalChecks,
  occasionIds: Set<number>,
  knownIds: Set<number>,
): LocalChecks {
  const pruned: LocalChecks = {};
  for (const [occIdStr, checks] of Object.entries(localChecks)) {
    const occId = Number(occIdStr);
    if (!occasionIds.has(occId)) {
      continue;
    }
    const kept = Object.fromEntries(
      Object.entries(checks).filter(([idStr]) => knownIds.has(Number(idStr))),
    );
    if (Object.keys(kept).length > 0) {
      pruned[occId] = kept;
    }
  }
  return pruned;
}

/**
 * Drops local check edits whose occasion or item no longer exists in
 * `checklist` (e.g. after a structure edit removed them), keeping every
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
  return pruneToKnownIds(
    localChecks,
    new Set(checklist.occasions.map(o => o.id)),
    new Set(checklist.categories.flatMap(c => c.items.map(i => i.id))),
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
  return pruneToKnownIds(
    localSpecChecks,
    new Set(checklist.occasions.map(o => o.id)),
    new Set(
      checklist.categories.flatMap(c =>
        c.items.flatMap(i => (i.specs ?? []).map(s => s.id)),
      ),
    ),
  );
}
