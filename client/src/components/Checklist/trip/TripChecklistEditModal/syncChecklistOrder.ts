import type { ChecklistCategory, ChecklistItem } from '@/types';
import { reorderTripCategories, reorderTripItems } from '@/utils/storage';

import type { SyncTracker } from '../../shared/checklistDiffSync';
import { needsReorder, resolveSavedIds } from '../../shared/checklistOrderSync';
import type { EditCategory } from '../../shared/types';

/** Inputs of {@link syncChecklistOrder}. */
interface ChecklistOrderSync {
  tripId: number;
  /** The categories as loaded when editing started. */
  originals: ChecklistCategory[];
  /** The draft categories, in the order the user arranged them. */
  edited: EditCategory[];
  /** Items per saved category once moves were applied. */
  itemsAfterMoves: Map<number, ChecklistItem[]>;
  /** Maps an edited category id to its saved id. */
  resolveCatId: (editedCatId: number) => number;
  categoryTracker: SyncTracker<ChecklistCategory>;
  itemTracker: SyncTracker<ChecklistItem>;
}

/**
 * Persists the arranged order of the kept categories and of each category's
 * items, after every create, delete and move has been synced. A group whose
 * order already matches what the server holds is skipped.
 *
 * @param sync - The loaded state, the draft and the retry trackers.
 */
export async function syncChecklistOrder({
  tripId,
  originals,
  edited,
  itemsAfterMoves,
  resolveCatId,
  categoryTracker,
  itemTracker,
}: ChecklistOrderSync): Promise<void> {
  const kept = edited.filter(cat => !cat._deleted);

  for (const cat of kept) {
    const catId = resolveCatId(cat.id);
    const desired = resolveSavedIds(
      cat.items.filter(item => !item._deleted).map(item => item.id),
      itemTracker,
    );
    const stored = (itemsAfterMoves.get(catId) ?? []).map(item => item.id);
    if (needsReorder(desired, stored)) {
      await reorderTripItems(tripId, catId, desired);
    }
  }

  const desiredCategories = resolveSavedIds(
    kept.map(cat => cat.id),
    categoryTracker,
  );
  if (
    needsReorder(
      desiredCategories,
      originals.map(cat => cat.id),
    )
  ) {
    await reorderTripCategories(tripId, desiredCategories);
  }
}
