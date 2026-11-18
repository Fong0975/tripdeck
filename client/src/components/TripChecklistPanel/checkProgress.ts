import type { ChecklistCategory, ChecklistItem } from '@/types';

import {
  getCheckUnits,
  getItemUnits,
  isUnitChecked,
  type CheckGetter,
} from './checkUnits';

/** How much of an item is checked for one occasion. */
export type CheckState = 'checked' | 'partial' | 'unchecked';

/**
 * Resolves an item's overall check state for one occasion from all of its
 * units (see {@link getItemUnits}): checked only when every unit is, partial
 * when some are.
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
  const units = getItemUnits(item);
  const checked = units.filter(unit =>
    isUnitChecked(unit, occId, getCheck, getSpecCheck),
  ).length;
  if (checked === 0) {
    return 'unchecked';
  }
  return checked === units.length ? 'checked' : 'partial';
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
