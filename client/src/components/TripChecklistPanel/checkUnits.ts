import { getEffectiveLocations } from '@tripdeck/shared';

import type { ChecklistCategory, ChecklistItem, ItemSpec } from '@/types';

/**
 * One independently checkable entry of the checklist: an item without specs,
 * or a spec, at one of its storage locations. A unit filed under two
 * locations yields two units whose checks do not affect each other.
 */
export type CheckUnit =
  | {
      kind: 'item';
      item: ChecklistItem;
      /** One of the item's effective locations; `''` when it has none. */
      location: string;
    }
  | {
      kind: 'spec';
      item: ChecklistItem;
      spec: ItemSpec;
      /** One of the spec's effective locations; `''` when it has none. */
      location: string;
    };

/** Reads one check mark for an occasion at a location, by item ID or spec ID. */
export type CheckGetter = (
  occId: number,
  id: number,
  location: string,
) => boolean;

/**
 * Lists the locations a spec is filed under. A spec without a location of its
 * own follows its item.
 *
 * @param item The spec's item.
 * @param spec The spec.
 * @returns Non-empty list; `['']` when neither has a known location.
 */
export function getSpecLocations(
  item: ChecklistItem,
  spec: ItemSpec,
): string[] {
  return getEffectiveLocations(spec.storage_location ?? item.storage_location);
}

/**
 * Expands a spec into its checkable units, one per location.
 *
 * @param item The spec's item.
 * @param spec The spec.
 */
export function getSpecUnits(item: ChecklistItem, spec: ItemSpec): CheckUnit[] {
  return getSpecLocations(item, spec).map((location): CheckUnit => ({
    kind: 'spec',
    item,
    spec,
    location,
  }));
}

/**
 * Expands an item into its checkable units: one per location for an item
 * without specs, one per spec and location for an item with specs.
 *
 * @param item The checklist item.
 */
export function getItemUnits(item: ChecklistItem): CheckUnit[] {
  const specs = item.specs ?? [];
  if (specs.length === 0) {
    return getEffectiveLocations(item.storage_location).map(
      (location): CheckUnit => ({ kind: 'item', item, location }),
    );
  }
  return specs.flatMap(spec => getSpecUnits(item, spec));
}

/**
 * Expands every item of the checklist into checkable units, keeping category
 * and item order.
 *
 * @param categories The checklist categories.
 */
export function getCheckUnits(categories: ChecklistCategory[]): CheckUnit[] {
  return categories.flatMap(category => category.items.flatMap(getItemUnits));
}

/**
 * Reads the check mark of a unit for one occasion.
 *
 * @param unit The unit to read.
 * @param occId The occasion to evaluate.
 * @param getCheck Reads an item's check.
 * @param getSpecCheck Reads a spec's check.
 */
export function isUnitChecked(
  unit: CheckUnit,
  occId: number,
  getCheck: CheckGetter,
  getSpecCheck: CheckGetter,
): boolean {
  return unit.kind === 'item'
    ? getCheck(occId, unit.item.id, unit.location)
    : getSpecCheck(occId, unit.spec.id, unit.location);
}

/**
 * Builds the accessible name of a unit's check cell, telling apart the rows
 * of one item filed under several locations.
 *
 * @param name Item or spec name.
 * @param location The unit's location; `''` when it has none.
 * @param occasionName The occasion the cell belongs to.
 * @returns e.g. `外套（託運） - 出發`, or `外套 - 出發` without a location.
 */
export function getCheckCellLabel(
  name: string,
  location: string,
  occasionName: string,
): string {
  return `${location ? `${name}（${location}）` : name} - ${occasionName}`;
}
