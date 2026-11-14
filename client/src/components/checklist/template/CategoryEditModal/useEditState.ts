import { useRef } from 'react';

import type { ChecklistCategory } from '@/types';

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
  updateById,
} from '../../shared/editStateUpdaters';
import type { EditItem, EditSpec } from '../../shared/types';
import { useTrackedEditState } from '../../shared/useTrackedEditState';

/**
 * Manages the local edit-state tree for a single checklist template
 * category (name and items→specs), including CRUD handlers that operate
 * purely on local state. Saving is handled separately by
 * useSaveCategoryEdit. `isDirty` reports whether the draft differs from
 * the given category.
 */
export function useEditState(category: ChecklistCategory) {
  const [edit, setEdit, isDirty] = useTrackedEditState(() =>
    toEditCategory(category),
  );
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const updateItems = (fn: (items: EditItem[]) => EditItem[]) => {
    setEdit(prev => ({ ...prev, items: fn(prev.items) }));
  };

  const updateCategoryName = (name: string) => {
    setEdit(prev => ({ ...prev, name }));
  };

  const updateItem = (itemId: number, fields: Partial<EditItem>) => {
    updateItems(items => updateById(items, itemId, patchFields(fields)));
  };

  const handleDeleteItem = (itemId: number) => {
    updateItems(items => removeOrMarkDeleted(items, itemId));
  };

  const addItem = () => {
    const newItem = newEditItem();
    updateItems(items => [...items, newItem]);
    scrollToBottomSoon(scrollBodyRef);
  };

  const updateSpec = (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    updateItems(items => updateById(items, itemId, patchSpec(specId, fields)));
  };

  const deleteSpec = (itemId: number, specId: number) => {
    updateItems(items => updateById(items, itemId, removeSpecById(specId)));
  };

  const addSpec = (itemId: number) => {
    const newSpec = newEditSpec();
    updateItems(items => updateById(items, itemId, appendSpec(newSpec)));
  };

  const visibleItems = edit.items.filter(i => !i._deleted);

  return {
    edit,
    isDirty,
    scrollBodyRef,
    visibleItems,
    updateCategoryName,
    updateItem,
    handleDeleteItem,
    addItem,
    updateSpec,
    deleteSpec,
    addSpec,
  };
}
