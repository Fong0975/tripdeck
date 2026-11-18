import type { LocationLabel } from '@tripdeck/shared';

import type { ChecklistCategory } from '@/types';

import { filterCategories, filterStorageGroups, type HiddenKeys } from './checklistFilter';
import { getItemUnits, type CheckUnit } from './checkUnits';
import { groupByStorage, type StorageGroup } from './groupByStorage';
import {
  filterCategoriesByUnits,
  filterStorageGroupsByUnits,
  type UnitVisibility,
} from './incompleteFilter';
import type { ViewMode } from './viewMode';

/**
 * Applies the item filter and then the unit visibility to the categories of
 * the "by category" view.
 *
 * @param categories - The checklist categories.
 * @param hidden - Items the filter hides.
 * @param isUnitVisible - Unit visibility; every unit is visible when omitted.
 */
export function getVisibleCategories(
  categories: ChecklistCategory[],
  hidden: HiddenKeys,
  isUnitVisible?: UnitVisibility,
): ChecklistCategory[] {
  const filtered = filterCategories(categories, hidden);
  return isUnitVisible
    ? filterCategoriesByUnits(filtered, isUnitVisible)
    : filtered;
}

/**
 * Groups the checklist by storage location, then applies the item filter and
 * the unit visibility, for the "by storage location" view.
 *
 * @param categories - The checklist categories.
 * @param labels - The defined location labels in display order.
 * @param hidden - Items the filter hides.
 * @param isUnitVisible - Unit visibility; every unit is visible when omitted.
 */
export function getVisibleStorageGroups(
  categories: ChecklistCategory[],
  labels: readonly LocationLabel[],
  hidden: HiddenKeys,
  isUnitVisible?: UnitVisibility,
): StorageGroup[] {
  const filtered = filterStorageGroups(
    groupByStorage(categories, labels),
    hidden,
  );
  return isUnitVisible
    ? filterStorageGroupsByUnits(filtered, isUnitVisible)
    : filtered;
}

/**
 * Lists the checkable units that the table currently shows rows for.
 *
 * @param viewMode - The current view.
 * @param categories - The checklist categories.
 * @param labels - The defined location labels in display order.
 * @param hidden - Items the filter hides.
 * @param isUnitVisible - Unit visibility; every unit is visible when omitted.
 */
export function getDisplayedUnits(
  viewMode: ViewMode,
  categories: ChecklistCategory[],
  labels: readonly LocationLabel[],
  hidden: HiddenKeys,
  isUnitVisible?: UnitVisibility,
): CheckUnit[] {
  if (viewMode === 'storage') {
    return getVisibleStorageGroups(
      categories,
      labels,
      hidden,
      isUnitVisible,
    ).flatMap(group => group.units);
  }
  return getVisibleCategories(categories, hidden, isUnitVisible).flatMap(
    category =>
      category.items.flatMap(item =>
        getItemUnits(item).filter(unit => isUnitVisible?.(unit) ?? true),
      ),
  );
}
