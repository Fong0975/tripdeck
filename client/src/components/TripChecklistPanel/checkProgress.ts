import type { ChecklistCategory, ChecklistItem, ItemSpec } from '@/types';

import {
  getCheckUnits,
  getItemUnits,
  getSpecUnits,
  isUnitChecked,
  type CheckGetter,
  type CheckUnit,
} from './checkUnits';

/** How much of an item is checked for one occasion. */
export type CheckState = 'checked' | 'partial' | 'unchecked';

/**
 * Resolves the combined check state of a group of units for one occasion:
 * checked only when every unit is, partial when some are.
 *
 * @param units The units to combine.
 * @param occId The occasion to evaluate.
 * @param getCheck Reads an item's own check.
 * @param getSpecCheck Reads a spec's check.
 */
export function getCheckState(
  units: CheckUnit[],
  occId: number,
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
): CheckState {
  const checked = units.filter(unit =>
    isUnitChecked(unit, occId, getCheck, getSpecCheck),
  ).length;
  if (checked === 0) {
    return 'unchecked';
  }
  return checked === units.length ? 'checked' : 'partial';
}

/**
 * Resolves an item's overall check state for one occasion from all of its
 * units (see {@link getItemUnits}).
 *
 * @param item The checklist item.
 * @param occId The occasion to evaluate.
 * @param getCheck Reads an item's own check.
 * @param getSpecCheck Reads a spec's check.
 */
export function getItemCheckState(
  item: ChecklistItem,
  occId: number,
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
): CheckState {
  return getCheckState(getItemUnits(item), occId, getCheck, getSpecCheck);
}

/**
 * Resolves a spec's overall check state for one occasion from its units, one
 * per location (see {@link getSpecUnits}).
 *
 * @param item The spec's item.
 * @param spec The spec.
 * @param occId The occasion to evaluate.
 * @param getSpecCheck Reads a spec's check.
 */
export function getSpecCheckState(
  item: ChecklistItem,
  spec: ItemSpec,
  occId: number,
  getSpecCheck: CheckGetter,
): CheckState {
  return getCheckState(
    getSpecUnits(item, spec),
    occId,
    () => false,
    getSpecCheck,
  );
}

/**
 * Counts the checkable units: one per item without specs, or per spec of an
 * item that has specs, for each storage location it is filed under.
 *
 * @param categories The checklist categories.
 */
export function countCheckUnits(categories: ChecklistCategory[]): number {
  return getCheckUnits(categories).length;
}

/**
 * Counts the checked units (see {@link countCheckUnits}) for one occasion.
 *
 * @param categories The checklist categories.
 * @param occId The occasion to evaluate.
 * @param getCheck Reads an item's own check.
 * @param getSpecCheck Reads a spec's check.
 */
export function countCheckedUnits(
  categories: ChecklistCategory[],
  occId: number,
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
): number {
  return getCheckUnits(categories).filter(unit =>
    isUnitChecked(unit, occId, getCheck, getSpecCheck),
  ).length;
}
