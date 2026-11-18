import type { ChecklistCategory, ChecklistOccasion } from '@/types';

import {
  getItemUnits,
  isUnitChecked,
  type CheckGetter,
  type CheckUnit,
} from './checkUnits';
import type { StorageGroup } from './groupByStorage';

/** Tells whether a unit is shown while only unfinished units are listed. */
export type UnitVisibility = (unit: CheckUnit) => boolean;

/**
 * Builds the key that identifies a unit across renders.
 *
 * @param kind - `item` for an item without specs, `spec` for a spec.
 * @param id - Item id or spec id, matching `kind`.
 * @param location - The unit's location; `''` when it has none.
 */
export function unitKeyOf(
  kind: CheckUnit['kind'],
  id: number,
  location: string,
): string {
  return `${kind}-${id}|${location}`;
}

/** Builds the key of a unit, see {@link unitKeyOf}. */
export function unitKey(unit: CheckUnit): string {
  return unit.kind === 'item'
    ? unitKeyOf('item', unit.item.id, unit.location)
    : unitKeyOf('spec', unit.spec.id, unit.location);
}

/**
 * Tells whether a unit is unfinished: it is unchecked for at least one
 * occasion. Without occasions nothing can be checked, so every unit is
 * unfinished.
 *
 * @param unit - The unit to test.
 * @param occasions - The occasions of the checklist.
 * @param getCheck - Reads an item's check.
 * @param getSpecCheck - Reads a spec's check.
 */
export function isUnitUnfinished(
  unit: CheckUnit,
  occasions: ChecklistOccasion[],
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
): boolean {
  return (
    occasions.length === 0 ||
    occasions.some(occ => !isUnitChecked(unit, occ.id, getCheck, getSpecCheck))
  );
}

/**
 * Builds the visibility rule of the "unfinished only" view: a unit is shown
 * while it is unfinished, or while its key is in `lingering` (units that were
 * just finished and are about to disappear).
 *
 * @param occasions - The occasions of the checklist.
 * @param getCheck - Reads an item's check.
 * @param getSpecCheck - Reads a spec's check.
 * @param lingering - Keys of the units that stay visible although finished.
 */
export function createUnfinishedVisibility(
  occasions: ChecklistOccasion[],
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
  lingering: ReadonlySet<string>,
): UnitVisibility {
  return unit =>
    lingering.has(unitKey(unit)) ||
    isUnitUnfinished(unit, occasions, getCheck, getSpecCheck);
}

/**
 * Keeps the items of the "by category" view that have at least one visible
 * unit. Categories left without items are dropped.
 *
 * @param categories - The checklist categories.
 * @param isVisible - Visibility of a unit.
 */
export function filterCategoriesByUnits(
  categories: ChecklistCategory[],
  isVisible: UnitVisibility,
): ChecklistCategory[] {
  return categories
    .map(category => ({
      ...category,
      items: category.items.filter(item => getItemUnits(item).some(isVisible)),
    }))
    .filter(category => category.items.length > 0);
}

/**
 * Keeps the visible units of the "by storage location" view. Groups left
 * without units are dropped.
 *
 * @param groups - The storage groups.
 * @param isVisible - Visibility of a unit.
 */
export function filterStorageGroupsByUnits(
  groups: StorageGroup[],
  isVisible: UnitVisibility,
): StorageGroup[] {
  return groups
    .map(group => ({ ...group, units: group.units.filter(isVisible) }))
    .filter(group => group.units.length > 0);
}
