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
 * tree differs from the initial categories (expansion state is ignored).
 */
export function useCategoryEditState(initial: ChecklistCategory[]) {
  const [categories, setCategories, isDirty] = useTrackedEditState(() =>
    initial.map(toEditCategory),
  );
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // ---------- Category handlers ----------

  const addCategoryLocal = () => {
    const newCat: EditCategory = {
      id: nextTempId(),
      name: '新分類',
      items: [],
    };
    setCategories(prev => [...prev, newCat]);
    scrollToBottomSoon(scrollBodyRef);
  };

  const updateCategoryName = (catId: number, name: string) => {
    setCategories(prev => updateIn(prev, catId, c => ({ ...c, name })));
  };

  const removeCategory = (catId: number) => {
    setCategories(prev => removeOrMarkDeleted(prev, catId));
  };

  const toggleCatExpanded = (catId: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // ---------- Item handlers ----------

  const addItemLocal = (catId: number) => {
    const newItem = newEditItem();
    setCategories(prev =>
      updateIn(prev, catId, c => ({ ...c, items: [...c.items, newItem] })),
    );
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

  const visibleCategories = categories.filter(c => !c._deleted);

  return {
    categories,
    isDirty,
    expandedCats,
    scrollBodyRef,
    visibleCategories,
    addCategoryLocal,
    updateCategoryName,
    removeCategory,
    toggleCatExpanded,
    addItemLocal,
    updateItem,
    removeItem,
    addSpecLocal,
    updateSpec,
    removeSpec,
  };
}
