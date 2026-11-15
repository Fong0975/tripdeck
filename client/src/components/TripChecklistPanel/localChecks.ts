import type { TripChecklist } from '@/types';

/** Unsaved check-state edits, keyed by occasion ID then item ID. */
export type LocalChecks = Record<number, Record<number, boolean>>;

/**
 * Drops local check edits whose occasion or item no longer exists in
 * `checklist` (e.g. after a structure edit removed them), keeping every
 * other edit so unsaved checks survive a checklist reload.
 *
 * @param localChecks The current unsaved edits.
 * @param checklist The freshly loaded checklist to reconcile against.
 * @returns A new edits map containing only still-valid entries; occasions
 *   left with no edits are omitted.
 */
export function pruneLocalChecks(
  localChecks: LocalChecks,
  checklist: TripChecklist,
): LocalChecks {
  const occasionIds = new Set(checklist.occasions.map(o => o.id));
  const itemIds = new Set(
    checklist.categories.flatMap(c => c.items.map(i => i.id)),
  );

  const pruned: LocalChecks = {};
  for (const [occIdStr, checks] of Object.entries(localChecks)) {
    const occId = Number(occIdStr);
    if (!occasionIds.has(occId)) {
      continue;
    }
    const kept = Object.fromEntries(
      Object.entries(checks).filter(([itemIdStr]) =>
        itemIds.has(Number(itemIdStr)),
      ),
    );
    if (Object.keys(kept).length > 0) {
      pruned[occId] = kept;
    }
  }
  return pruned;
}
