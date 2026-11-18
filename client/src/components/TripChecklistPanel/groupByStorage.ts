import { NO_LOCATION, type LocationLabel } from '@tripdeck/shared';

import type { ChecklistCategory } from '@/types';

import { getItemUnits, type CheckUnit } from './checkUnits';

/**
 * Group key: the name of a label that is its own group, or
 * {@link NO_LOCATION} for the group of every other unit.
 */
export type StorageGroupKey = string;

/** A checkable unit placed in a storage group, with its category. */
export type StorageUnit = CheckUnit & {
  categoryId: number;
  categoryName: string;
};

export interface StorageGroup {
  key: StorageGroupKey;
  units: StorageUnit[];
}

/** Consecutive units of a group that belong to the same category. */
export interface CategorySection {
  categoryId: number;
  categoryName: string;
  units: StorageUnit[];
}

/** Flattens categories into checkable units, keeping category and item order. */
function toStorageUnits(categories: ChecklistCategory[]): StorageUnit[] {
  return categories.flatMap(category =>
    category.items.flatMap(item =>
      getItemUnits(item).map((unit): StorageUnit => ({
        ...unit,
        categoryId: category.id,
        categoryName: category.name,
      })),
    ),
  );
}

/**
 * Splits the units of a storage group into per-category sections. Units are
 * already ordered by category, so only consecutive units are merged.
 *
 * @param units The units of one storage group.
 */
export function splitByCategory(units: StorageUnit[]): CategorySection[] {
  return units.reduce<CategorySection[]>((sections, unit) => {
    const last = sections[sections.length - 1];
    if (last && last.categoryId === unit.categoryId) {
      last.units.push(unit);
    } else {
      sections.push({
        categoryId: unit.categoryId,
        categoryName: unit.categoryName,
        units: [unit],
      });
    }
    return sections;
  }, []);
}

/**
 * Groups the checkable units of a checklist by storage location. Every unit
 * already carries exactly one location (a unit filed under several locations
 * is expanded into one unit per location), so each lands in exactly one
 * group. A label with `show_as_group` gets a group of its own; units without
 * a location, under a label that is not its own group, or under a name that
 * is no longer a defined label go to the {@link NO_LOCATION} group. Empty
 * groups are omitted.
 *
 * @param categories The checklist categories.
 * @param labels The defined location labels in display order.
 * @returns Groups in label order, then the {@link NO_LOCATION} group.
 */
export function groupByStorage(
  categories: ChecklistCategory[],
  labels: readonly LocationLabel[],
): StorageGroup[] {
  const units = toStorageUnits(categories);
  const groupNames = labels
    .filter(label => label.show_as_group)
    .map(label => label.name);
  const groups: StorageGroup[] = [
    ...groupNames.map(name => ({
      key: name,
      units: units.filter(unit => unit.location === name),
    })),
    {
      key: NO_LOCATION,
      units: units.filter(unit => !groupNames.includes(unit.location)),
    },
  ];
  return groups.filter(group => group.units.length > 0);
}
