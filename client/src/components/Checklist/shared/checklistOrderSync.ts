import type { SyncTracker } from './checklistDiffSync';

/**
 * Replaces the temp (negative) ids in `ids` with the server ids of the
 * entries created for them during this save.
 *
 * @param ids - Ids in their desired order; saved ids are kept as they are.
 * @param tracker - Tracker of the sync that created the entries.
 * @returns The same order, expressed in server ids.
 * @throws When a temp id has no created entry, which means the entry was
 *   never saved and cannot be ordered.
 */
export function resolveSavedIds(
  ids: number[],
  tracker: SyncTracker<{ id: number }>,
): number[] {
  return ids.map(id => {
    if (id > 0) {
      return id;
    }
    const created = tracker.added.get(id);
    if (!created) {
      throw new Error(`Checklist entry ${id} was not saved before ordering`);
    }
    return created.id;
  });
}

/**
 * Whether a reorder call is needed after the structural sync. The server
 * keeps surviving entries in their original relative order and appends the
 * new or moved-in ones, so only a desired order that differs from that
 * prediction has to be sent.
 *
 * @param desiredIds - Server ids of the final entries, in the desired order.
 * @param originalIds - Server ids of the group before this save, in their
 *   stored order (entries moved in by this save already included, at the end).
 * @returns True when the desired order differs from what the server holds.
 */
export function needsReorder(
  desiredIds: number[],
  originalIds: number[],
): boolean {
  const desired = new Set(desiredIds);
  const original = new Set(originalIds);
  const predicted = [
    ...originalIds.filter(id => desired.has(id)),
    ...desiredIds.filter(id => !original.has(id)),
  ];
  return predicted.some((id, index) => id !== desiredIds[index]);
}
