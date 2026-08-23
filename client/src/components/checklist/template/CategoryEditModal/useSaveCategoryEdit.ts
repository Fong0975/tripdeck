import { useState } from 'react';

import type { ChecklistCategory } from '@/types';
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
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from '../../shared/checklistDiffSync';
import type { EditCategory } from '../../shared/types';

/**
 * Diffs the local edit state against the originally-loaded category and
 * saves all changes (name, and items→specs) via the checklist diff-sync
 * engine.
 */
export function useSaveCategoryEdit(
  category: ChecklistCategory,
  edit: EditCategory,
  onSaved: () => void,
  onClose: () => void,
) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
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
