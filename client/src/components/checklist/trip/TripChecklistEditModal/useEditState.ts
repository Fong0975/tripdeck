import type { TripChecklist } from '@/types';

import { useCategoryEditState } from './useCategoryEditState';
import { useOccasionEditState } from './useOccasionEditState';

/**
 * Composes the occasion and category edit-state hooks into the combined
 * shape TripChecklistEditModal and useSaveChecklist expect. Occasions and
 * categories→items→specs are independent state slices with no nesting
 * relationship between them, so each is managed by its own hook.
 * `isDirty` is true when either slice differs from the loaded checklist.
 */
export function useEditState(checklist: TripChecklist) {
  const {
    occasions,
    visibleOccasions,
    isDirty: occasionsDirty,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
  } = useOccasionEditState(checklist.occasions);

  const {
    categories,
    isDirty: categoriesDirty,
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
  } = useCategoryEditState(checklist.categories);

  return {
    edit: { occasions, categories },
    isDirty: occasionsDirty || categoriesDirty,
    expandedCats,
    scrollBodyRef,
    visibleOccasions,
    visibleCategories,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
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
