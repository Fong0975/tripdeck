import type { ChecklistCategory, ChecklistItem } from '@/types';

/** Reads one check mark for an occasion, by item ID or spec ID. */
export type CheckGetter = (occId: number, id: number) => boolean;

/** How much of an item is checked for one occasion. */
export type CheckState = 'checked' | 'partial' | 'unchecked';

/**
 * Resolves an item's check state for one occasion. An item without specs
 * uses its own check; an item with specs is derived from them, so it is
 * checked only when every spec is.
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
  const specs = item.specs ?? [];
  if (specs.length === 0) {
    return getCheck(occId, item.id) ? 'checked' : 'unchecked';
  }
  const checked = specs.filter(spec => getSpecCheck(occId, spec.id)).length;
  if (checked === 0) {
    return 'unchecked';
  }
  return checked === specs.length ? 'checked' : 'partial';
}

/**
 * Counts the checkable units: one per item without specs, one per spec for
 * an item that has specs.
 *
 * @param categories The checklist categories.
 */
export function countCheckUnits(categories: ChecklistCategory[]): number {
  return categories
    .flatMap(category => category.items)
    .reduce((sum, item) => sum + Math.max(item.specs?.length ?? 0, 1), 0);
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
  return categories
    .flatMap(category => category.items)
    .reduce((sum, item) => {
      const specs = item.specs ?? [];
      if (specs.length === 0) {
        return sum + (getCheck(occId, item.id) ? 1 : 0);
      }
      return sum + specs.filter(spec => getSpecCheck(occId, spec.id)).length;
    }, 0);
}
