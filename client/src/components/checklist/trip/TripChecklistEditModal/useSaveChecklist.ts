import { useRef } from 'react';

import { useSubmitting } from '@/hooks/useSubmitting';
import { showToast } from '@/lib/toast';
import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  ItemSpec,
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
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

import {
  createSyncTracker,
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from '../../shared/checklistDiffSync';
import type { EditCategory, EditOccasion } from '../../shared/types';

function createTrackers() {
  return {
    occasions: createSyncTracker<ChecklistOccasion>(),
    categories: createSyncTracker<ChecklistCategory>(),
    items: createSyncTracker<ChecklistItem>(),
    specs: createSyncTracker<ItemSpec>(),
  };
}

/**
 * Diffs the local edit state against the originally-loaded checklist and
 * saves all changes (occasions, and categories→items→specs) via the
 * checklist diff-sync engine.
 *
 * Saving is many sequential API calls, so a failure can leave some of them
 * applied. Rather than reloading the checklist (which would discard the
 * user's unsaved edits), per-entity-kind sync trackers persist across save
 * attempts for this modal session, making a retry skip the creates/deletes
 * that already succeeded instead of duplicating them or hitting 404s.
 * Concurrent saves are ignored while one is in flight.
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
  const { submitting: saving, run } = useSubmitting();
  const trackers = useRef(createTrackers());

  const save = async () => {
    const { occasions, categories, items, specs } = trackers.current;
    try {
      await syncEditableList(checklist.occasions, edit.occasions, {
        isChanged: (editOcc, origOcc) => editOcc.name.trim() !== origOcc.name,
        update: (id, editOcc, origOcc) =>
          updateOccasion(tripId, id, editOcc.name.trim() || origOcc.name),
        add: editOcc => addOccasion(tripId, editOcc.name.trim() || '新時機'),
        remove: id => deleteOccasion(tripId, id),
        tracker: occasions,
      });

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
        tracker: categories,
        syncChildren: (editCat, catId, origCat) =>
          syncEditableList(origCat?.items ?? [], editCat.items, {
            isChanged: itemFieldsChanged,
            update: (itemId, editItem, origItem) =>
              updateTripItem(
                tripId,
                itemId,
                itemPayload(editItem, origItem.name),
              ),
            add: editItem =>
              addTripItem(tripId, catId, itemPayload(editItem, '新項目')),
            remove: itemId => deleteTripItem(tripId, itemId),
            tracker: items,
            syncChildren: (editItem, itemId, origItem) =>
              syncEditableList(origItem?.specs ?? [], editItem.specs, {
                isChanged: specFieldsChanged,
                update: (specId, editSpec, origSpec) =>
                  updateTripItemSpec(
                    tripId,
                    itemId,
                    specId,
                    specPayload(editSpec, origSpec.name),
                  ),
                add: editSpec =>
                  addTripItemSpec(tripId, itemId, specPayload(editSpec)),
                remove: specId => deleteTripItemSpec(tripId, itemId, specId),
                tracker: specs,
              }),
          }),
      });

      trackers.current = createTrackers();
      onSaved();
      onClose();
      showToast('success', '已儲存行李清單。');
    } catch {
      showToast('error', '儲存行李清單失敗，請稍後再試');
    }
  };

  const handleSave = () => run(save);

  return { saving, handleSave };
}
