import { useRef, useState } from 'react';

import type { ChecklistCategory } from '@/types';

import { nextTempId } from '../../shared/checklistUtils';
import {
  appendSpec,
  newEditItem,
  newEditSpec,
  patchFields,
  patchSpec,
  removeOrMarkDeleted,
  removeSpecById,
  scrollToBottomSoon,
  toEditCategory,
  updateIn,
} from '../../shared/editStateUpdaters';
import type { EditCategory, EditItem, EditSpec } from '../../shared/types';
import { useTrackedEditState } from '../../shared/useTrackedEditState';

/**
 * Manages the local edit-state tree for checklist categories→items→specs,
 * including CRUD handlers that operate purely on local state. Saving is
 * handled separately by useSaveChecklist. `isDirty` reports whether the
 * tree differs from the initial categories (the selection is ignored).
 * `selectedCategory` falls back to the first visible category when the
 * requested one is missing or deleted, and is null when none remain.
 */
export function useCategoryEditState(initial: ChecklistCategory[]) {
  const [categories, setCategories, isDirty] = useTrackedEditState(() =>
    initial.map(toEditCategory),
  );
  const [requestedId, setRequestedId] = useState<number | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const visibleCategories = categories.filter(c => !c._deleted);
  const selectedCategory = (visibleCategories.find(c => c.id === requestedId) ??
    visibleCategories[0] ??
    null) as EditCategory | null;

  // ---------- Category handlers ----------

  const addCategoryLocal = () => {
    const newCat: EditCategory = {
      id: nextTempId(),
      name: '新分類',
      items: [],
    };
    setCategories(prev => [...prev, newCat]);
    setRequestedId(newCat.id);
  };

  const updateCategoryName = (catId: number, name: string) => {
    setCategories(prev => updateIn(prev, catId, c => ({ ...c, name })));
  };

  const removeCategory = (catId: number) => {
    const index = visibleCategories.findIndex(c => c.id === catId);
    const neighbor =
      visibleCategories[index + 1] ?? visibleCategories[index - 1] ?? null;
    setCategories(prev => removeOrMarkDeleted(prev, catId));
    if (selectedCategory?.id === catId) {
      setRequestedId(neighbor?.id ?? null);
    }
  };

  // ---------- Item handlers ----------

  const addItemLocal = (catId: number) => {
    const newItem = newEditItem();
    setCategories(prev =>
      updateIn(prev, catId, c => ({ ...c, items: [...c.items, newItem] })),
    );
    scrollToBottomSoon(scrollBodyRef);
  };

  const updateItem = (
    catId: number,
    itemId: number,
    fields: Partial<EditItem>,
  ) => {
    setCategories(prev => updateIn(prev, catId, itemId, patchFields(fields)));
  };

  const removeItem = (catId: number, itemId: number) => {
    setCategories(prev =>
      updateIn(prev, catId, c => ({
        ...c,
        items: removeOrMarkDeleted(c.items, itemId),
      })),
    );
  };

  // ---------- Spec handlers ----------

  const addSpecLocal = (catId: number, itemId: number) => {
    const newSpec = newEditSpec();
    setCategories(prev => updateIn(prev, catId, itemId, appendSpec(newSpec)));
  };

  const updateSpec = (
    catId: number,
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    setCategories(prev =>
      updateIn(prev, catId, itemId, patchSpec(specId, fields)),
    );
  };

  const removeSpec = (catId: number, itemId: number, specId: number) => {
    setCategories(prev =>
      updateIn(prev, catId, itemId, removeSpecById(specId)),
    );
  };

  return {
    categories,
    isDirty,
    scrollBodyRef,
    visibleCategories,
    selectedCategory,
    selectCategory: setRequestedId,
    addCategoryLocal,
    updateCategoryName,
    removeCategory,
    addItemLocal,
    updateItem,
    removeItem,
    addSpecLocal,
    updateSpec,
    removeSpec,
  };
}
