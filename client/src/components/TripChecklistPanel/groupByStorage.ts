import {
  STORAGE_OPTIONS,
  hasStorageOption,
  type StorageOption,
} from '@/components/Checklist/shared/checklistUtils';
import type { ChecklistCategory, ChecklistItem, ItemSpec } from '@/types';

/** Group key: a storage option, or `none` when no location is set. */
export type StorageGroupKey = StorageOption | 'none';

/** A checkable unit placed in a storage group. */
export type StorageUnit =
  | {
      kind: 'item';
      categoryId: number;
      categoryName: string;
      item: ChecklistItem;
    }
  | {
      kind: 'spec';
      categoryId: number;
      categoryName: string;
      item: ChecklistItem;
      spec: ItemSpec;
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

/**
 * Resolves the storage location a unit is filed under. A spec without its own
 * location inherits the one of its item.
 */
function getUnitLocation(unit: StorageUnit): string | null {
  if (unit.kind === 'item') {
    return unit.item.storage_location;
  }
  return unit.spec.storage_location ?? unit.item.storage_location;
}

/** Flattens categories into checkable units, keeping category and item order. */
function toUnits(categories: ChecklistCategory[]): StorageUnit[] {
  return categories.flatMap(category =>
    category.items.flatMap((item): StorageUnit[] => {
      const specs = item.specs ?? [];
      if (specs.length === 0) {
        return [
          {
            kind: 'item',
            categoryId: category.id,
            categoryName: category.name,
            item,
          },
        ];
      }
      return specs.map(spec => ({
        kind: 'spec' as const,
        categoryId: category.id,
        categoryName: category.name,
        item,
        spec,
      }));
    }),
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
 * Groups the checkable units of a checklist by storage location. A unit with
 * several locations appears once in each matching group; a unit with none
 * goes to the `none` group. Empty groups are omitted.
 *
 * @param categories The checklist categories.
 * @returns Groups ordered by {@link STORAGE_OPTIONS}, then `none`.
 */
export function groupByStorage(
  categories: ChecklistCategory[],
): StorageGroup[] {
  const units = toUnits(categories);
  const groups: StorageGroup[] = STORAGE_OPTIONS.map(option => ({
    key: option,
    units: units.filter(unit =>
      hasStorageOption(getUnitLocation(unit), option),
    ),
  }));
  groups.push({
    key: 'none',
    units: units.filter(
      unit =>
        !STORAGE_OPTIONS.some(option =>
          hasStorageOption(getUnitLocation(unit), option),
        ),
    ),
  });
  return groups.filter(group => group.units.length > 0);
}
