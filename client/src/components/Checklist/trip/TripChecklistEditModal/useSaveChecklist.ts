import type {
  ChecklistCategory,
  ChecklistOccasion,
  TripChecklist,
} from '@/types';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  moveTripItem,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

import {
  createSyncTracker,
  syncEditableList,
} from '../../shared/checklistDiffSync';
import {
  applyItemMoves,
  itemsAfterMoves,
  planItemMoves,
} from '../../shared/itemMoveSync';
import {
  createItemSpecTrackers,
  type ItemSpecApi,
  makeItemSpecSync,
} from '../../shared/itemSpecSync';
import type { EditCategory, EditOccasion } from '../../shared/types';
import { useRetryableSave } from '../../shared/useRetryableSave';

import { syncChecklistOrder } from './syncChecklistOrder';

function createTrackers() {
  return {
    occasions: createSyncTracker<ChecklistOccasion>(),
    categories: createSyncTracker<ChecklistCategory>(),
    movedItemIds: new Set<number>(),
    ...createItemSpecTrackers(),
  };
}

/** Binds the trip item/spec endpoints to one trip category. */
function tripItemSpecApi(tripId: number, catId: number): ItemSpecApi {
  return {
    addItem: data => addTripItem(tripId, catId, data),
    updateItem: (itemId, data) => updateTripItem(tripId, itemId, data),
    removeItem: itemId => deleteTripItem(tripId, itemId),
    addSpec: (itemId, data) => addTripItemSpec(tripId, itemId, data),
    updateSpec: (itemId, specId, data) =>
      updateTripItemSpec(tripId, itemId, specId, data),
    removeSpec: (itemId, specId) => deleteTripItemSpec(tripId, itemId, specId),
  };
}

/**
 * Diffs the local edit state against the originally-loaded checklist and
 * saves all changes (occasions, categories→items→specs, item moves between
 * categories, and the arranged order) via the checklist diff-sync engine.
 * Items moved between categories are moved (not deleted and re-created) so
 * their check marks survive. Retries after a partial failure are
 * idempotent; see {@link useRetryableSave}.
 *
 * @param tripId - The trip whose checklist is being edited.
 * @param checklist - The checklist as loaded when editing started.
 * @param edit - The current local edit state.
 * @param onSaved - Called after a fully successful save.
 * @param onClose - Closes the edit modal after a successful save.
 * @returns `saving` while a save is in flight, and the `handleSave` action.
 */
export function useSaveChecklist(
  tripId: number,
  checklist: TripChecklist,
  edit: { occasions: EditOccasion[]; categories: EditCategory[] },
  onSaved: () => void,
  onClose: () => void,
) {
  return useRetryableSave({
    createTrackers,
    sync: async trackers => {
      const syncItems = (catId: number) =>
        makeItemSpecSync(tripItemSpecApi(tripId, catId), trackers);

      await syncEditableList(checklist.occasions, edit.occasions, {
        isChanged: (editOcc, origOcc) => editOcc.name.trim() !== origOcc.name,
        update: (id, editOcc, origOcc) =>
          updateOccasion(tripId, id, editOcc.name.trim() || origOcc.name),
        add: editOcc => addOccasion(tripId, editOcc.name.trim() || '新時機'),
        remove: id => deleteOccasion(tripId, id),
        tracker: trackers.occasions,
      });

      const moves = planItemMoves(checklist.categories, edit.categories);
      const resolveCatId = await applyItemMoves(moves, {
        editedCategories: edit.categories,
        categoryTracker: trackers.categories,
        movedItemIds: trackers.movedItemIds,
        createCategory: editCat =>
          addTripCategory(tripId, editCat.name.trim() || '新分類'),
        moveItem: (itemId, targetCatId) =>
          moveTripItem(tripId, itemId, targetCatId),
      });
      const itemsByCategory = itemsAfterMoves(
        checklist.categories,
        moves,
        resolveCatId,
      );

      await syncEditableList(checklist.categories, edit.categories, {
        isChanged: (editCat, origCat) => editCat.name.trim() !== origCat.name,
        update: (catId, editCat, origCat) =>
          updateTripCategory(
            tripId,
            catId,
            editCat.name.trim() || origCat.name,
          ),
        add: editCat =>
          addTripCategory(tripId, editCat.name.trim() || '新分類'),
        remove: catId => deleteTripCategory(tripId, catId),
        tracker: trackers.categories,
        syncChildren: (editCat, catId) =>
          syncItems(catId)(itemsByCategory.get(catId) ?? [], editCat.items),
      });

      await syncChecklistOrder({
        tripId,
        originals: checklist.categories,
        edited: edit.categories,
        itemsAfterMoves: itemsByCategory,
        resolveCatId,
        categoryTracker: trackers.categories,
        itemTracker: trackers.items,
      });
    },
    onSaved,
    onClose,
    successMessage: '已儲存行李清單。',
    errorMessage: '儲存行李清單失敗，請稍後再試',
  });
}
