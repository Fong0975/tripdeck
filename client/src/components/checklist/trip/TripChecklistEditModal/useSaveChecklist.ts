import { useState } from 'react';

import type { TripChecklist } from '@/types';
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
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from '../../shared/checklistDiffSync';
import type { EditCategory, EditOccasion } from '../../shared/types';

/**
 * Diffs the local edit state against the originally-loaded checklist and
 * saves all changes (occasions, and categories→items→specs) via the
 * checklist diff-sync engine.
 */
export function useSaveChecklist(
  tripId: number,
  checklist: TripChecklist,
  edit: { occasions: EditOccasion[]; categories: EditCategory[] },
  onSaved: () => void,
  onClose: () => void,
) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await syncEditableList(checklist.occasions, edit.occasions, {
        isChanged: (editOcc, origOcc) => editOcc.name.trim() !== origOcc.name,
        update: (id, editOcc, origOcc) =>
          updateOccasion(tripId, id, editOcc.name.trim() || origOcc.name),
        add: editOcc => addOccasion(tripId, editOcc.name.trim() || '新時機'),
        remove: id => deleteOccasion(tripId, id),
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
              }),
          }),
      });

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave };
}
