import { NO_LOCATION } from '@tripdeck/shared';

import {
  STORAGE_OPTIONS,
  type StorageOption,
} from '@/components/Checklist/shared/checklistUtils';
import type { ChecklistCategory } from '@/types';

import { getItemUnits, type CheckUnit } from './checkUnits';

/** Group key: a storage option, or `none` when no location is set. */
export type StorageGroupKey = StorageOption | 'none';

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
 * group; units without a location go to the `none` group. Empty groups are
 * omitted.
 *
 * @param categories The checklist categories.
 * @returns Groups ordered by {@link STORAGE_OPTIONS}, then `none`.
 */
export function groupByStorage(
  categories: ChecklistCategory[],
): StorageGroup[] {
  const units = toStorageUnits(categories);
  const groups: StorageGroup[] = [
    ...STORAGE_OPTIONS.map(option => ({
      key: option,
      units: units.filter(unit => unit.location === option),
    })),
    {
      key: 'none',
      units: units.filter(unit => unit.location === NO_LOCATION),
    },
  ];
  return groups.filter(group => group.units.length > 0);
}
