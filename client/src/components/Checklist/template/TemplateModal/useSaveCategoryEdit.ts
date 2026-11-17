import type { ChecklistCategory } from '@/types';
import {
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  moveTemplateItem,
  reorderTemplateItems,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

import { needsReorder, resolveSavedIds } from '../../shared/checklistOrderSync';
import {
  createItemSpecTrackers,
  type ItemSpecApi,
  makeItemSpecSync,
} from '../../shared/itemSpecSync';
import type { EditCategory } from '../../shared/types';
import { useRetryableSave } from '../../shared/useRetryableSave';

/** Binds the template item/spec endpoints to one template category. */
function templateItemSpecApi(catId: number): ItemSpecApi {
  return {
    addItem: data => addTemplateItem(catId, data),
    updateItem: (itemId, data) => updateTemplateItem(catId, itemId, data),
    removeItem: itemId => deleteTemplateItem(catId, itemId),
    addSpec: (itemId, data) => addTemplateItemSpec(catId, itemId, data),
    updateSpec: (itemId, specId, data) =>
      updateTemplateItemSpec(catId, itemId, specId, data),
    removeSpec: (itemId, specId) =>
      deleteTemplateItemSpec(catId, itemId, specId),
  };
}

function createTrackers() {
  return { ...createItemSpecTrackers(), movedItemIds: new Set<number>() };
}

/**
 * Diffs the local edit state against the originally-loaded category and
 * saves all changes (name, items→specs, items moved to other categories,
 * and the arranged item order) via the checklist diff-sync engine. Retries after a partial failure are idempotent; see
 * {@link useRetryableSave}.
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
  return useRetryableSave({
    createTrackers,
    sync: async trackers => {
      const catId = edit.id;
      const name = edit.name.trim();

      if (name && name !== category.name) {
        await updateTemplateCategory(catId, name);
      }

      const syncItems = makeItemSpecSync(templateItemSpecApi(catId), trackers);
      await syncItems(category.items, edit.items);

      for (const item of edit.items) {
        const target = item._movedTo;
        if (
          item.id > 0 &&
          target !== undefined &&
          !item._deleted &&
          !trackers.movedItemIds.has(item.id)
        ) {
          await moveTemplateItem(catId, item.id, target);
          trackers.movedItemIds.add(item.id);
        }
      }

      const desired = resolveSavedIds(
        edit.items
          .filter(item => !item._deleted && item._movedTo === undefined)
          .map(item => item.id),
        trackers.items,
      );
      if (
        needsReorder(
          desired,
          category.items.map(item => item.id),
        )
      ) {
        await reorderTemplateItems(catId, desired);
      }
    },
    onSaved,
    onClose,
    successMessage: '已儲存分類。',
    errorMessage: '儲存分類失敗，請稍後再試',
  });
}
