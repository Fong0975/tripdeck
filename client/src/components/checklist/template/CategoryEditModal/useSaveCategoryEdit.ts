import { useRef } from 'react';

import { useSubmitting } from '@/hooks/useSubmitting';
import { showToast } from '@/lib/toast';
import type { ChecklistCategory, ChecklistItem, ItemSpec } from '@/types';
import {
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

import {
  createSyncTracker,
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from '../../shared/checklistDiffSync';
import type { EditCategory } from '../../shared/types';

function createTrackers() {
  return {
    items: createSyncTracker<ChecklistItem>(),
    specs: createSyncTracker<ItemSpec>(),
  };
}

/**
 * Diffs the local edit state against the originally-loaded category and
 * saves all changes (name, and items→specs) via the checklist diff-sync
 * engine.
 *
 * Saving is many sequential API calls, so a failure can leave some of them
 * applied. Rather than reloading the category (which would discard the
 * user's unsaved edits), per-entity-kind sync trackers persist across save
 * attempts for this modal session, making a retry skip the creates/deletes
 * that already succeeded instead of duplicating them or hitting 404s.
 * Concurrent saves are ignored while one is in flight.
 *
 * @param category - The template category as loaded when editing started.
 * @param edit - The current local edit state.
 * @param onSaved - Called after a fully successful save.
 * @param onClose - Closes the edit modal after a successful save.
 * @returns `saving` while a save is in flight, and the `handleSave` action.
 */
export function useSaveCategoryEdit(
  category: ChecklistCategory,
  edit: EditCategory,
  onSaved: () => void,
  onClose: () => void,
) {
  const { submitting: saving, run } = useSubmitting();
  const trackers = useRef(createTrackers());

  const save = async () => {
    const { items, specs } = trackers.current;
    try {
      const catId = edit.id;

      if (edit.name.trim() && edit.name.trim() !== category.name) {
        await updateTemplateCategory(catId, edit.name.trim());
      }

      await syncEditableList(category.items, edit.items, {
        isChanged: itemFieldsChanged,
        update: (itemId, editItem, origItem) =>
          updateTemplateItem(
            catId,
            itemId,
            itemPayload(editItem, origItem.name),
          ),
        add: editItem =>
          addTemplateItem(catId, itemPayload(editItem, '新項目')),
        remove: itemId => deleteTemplateItem(catId, itemId),
        tracker: items,
        syncChildren: (editItem, itemId, origItem) =>
          syncEditableList(origItem?.specs ?? [], editItem.specs, {
            isChanged: specFieldsChanged,
            update: (specId, editSpec, origSpec) =>
              updateTemplateItemSpec(
                catId,
                itemId,
                specId,
                specPayload(editSpec, origSpec.name),
              ),
            add: editSpec =>
              addTemplateItemSpec(catId, itemId, specPayload(editSpec)),
            remove: specId => deleteTemplateItemSpec(catId, itemId, specId),
            tracker: specs,
          }),
      });

      trackers.current = createTrackers();
      onSaved();
      onClose();
      showToast('success', '已儲存分類。');
    } catch {
      showToast('error', '儲存分類失敗，請稍後再試');
    }
  };

  const handleSave = () => run(save);

  return { saving, handleSave };
}
