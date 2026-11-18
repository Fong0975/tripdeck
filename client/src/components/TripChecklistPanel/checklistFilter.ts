import { NO_LOCATION } from '@tripdeck/shared';

import type { ChecklistCategory } from '@/types';

import { NO_LOCATION_GROUP_LABEL, type StorageGroup } from './groupByStorage';

/** One selectable item of a {@link FilterGroup}. */
export interface FilterItem {
  id: number;
  name: string;
}

/** A group of the current view (a category or a storage group) with its items. */
export interface FilterGroup {
  /** Category id or storage group key; unique within one view. */
  key: string;
  label: string;
  items: FilterItem[];
}

/**
 * Keys of the items hidden by the filter, built with {@link hiddenKey}.
 * Everything not listed is visible, so items added later are visible too.
 */
export type HiddenKeys = ReadonlySet<string>;

/** Visibility of a group: all, some or none of its items are shown. */
export type GroupState = 'all' | 'some' | 'none';

/** Selection that hides nothing. */
export const NO_HIDDEN_KEYS: HiddenKeys = new Set<string>();

/**
 * Builds the key under which an item is hidden in one group. The same item
 * can sit in several storage groups and is hidden per group.
 *
 * @param groupKey - {@link FilterGroup.key} of the group.
 * @param itemId - Item id.
 */
export function hiddenKey(groupKey: string, itemId: number): string {
  return `${itemId}|${groupKey}`;
}

/** Collects the distinct items in first-seen order. */
function distinctItems(items: FilterItem[]): FilterItem[] {
  const seen = new Set<number>();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Builds the filter groups of the "by category" view.
 *
 * @param categories - The checklist categories.
 * @returns One group per category, in category order.
 */
export function buildCategoryFilterGroups(
  categories: ChecklistCategory[],
): FilterGroup[] {
  return categories.map(category => ({
    key: String(category.id),
    label: category.name,
    items: category.items.map(item => ({ id: item.id, name: item.name })),
  }));
}

/**
 * Builds the filter groups of the "by storage location" view. An item with
 * several units in a group (e.g. one per spec) is listed once.
 *
 * @param groups - The storage groups of the view.
 * @returns One group per storage group, in the same order.
 */
export function buildStorageFilterGroups(
  groups: StorageGroup[],
): FilterGroup[] {
  return groups.map(group => ({
    key: group.key,
    label: group.key === NO_LOCATION ? NO_LOCATION_GROUP_LABEL : group.key,
    items: distinctItems(
      group.units.map(unit => ({ id: unit.item.id, name: unit.item.name })),
    ),
  }));
}

/**
 * Tells whether an item is hidden in a group.
 *
 * @param hidden - The hidden keys.
 * @param groupKey - {@link FilterGroup.key} of the group.
 * @param itemId - Item id.
 */
export function isHidden(
  hidden: HiddenKeys,
  groupKey: string,
  itemId: number,
): boolean {
  return hidden.has(hiddenKey(groupKey, itemId));
}

/**
 * Flips the visibility of one item in a group.
 *
 * @returns A new set; the input is not modified.
 */
export function toggleItem(
  hidden: HiddenKeys,
  groupKey: string,
  itemId: number,
): Set<string> {
  const next = new Set(hidden);
  const key = hiddenKey(groupKey, itemId);
  if (!next.delete(key)) {
    next.add(key);
  }
  return next;
}

/**
 * Reports how many of a group's items are visible.
 *
 * @param hidden - The hidden keys.
 * @param group - The group to inspect.
 */
export function groupState(hidden: HiddenKeys, group: FilterGroup): GroupState {
  const visible = group.items.filter(
    item => !isHidden(hidden, group.key, item.id),
  ).length;
  if (visible === group.items.length) {
    return 'all';
  }
  return visible === 0 ? 'none' : 'some';
}

/**
 * Shows every item of a group when some are hidden, otherwise hides them all.
 *
 * @returns A new set; the input is not modified.
 */
export function toggleGroup(
  hidden: HiddenKeys,
  group: FilterGroup,
): Set<string> {
  const next = new Set(hidden);
  const hideAll = groupState(hidden, group) === 'all';
  for (const item of group.items) {
    const key = hiddenKey(group.key, item.id);
    if (hideAll) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return next;
}

/**
 * Counts the hidden items of the given groups. Keys of items that are no
 * longer listed (e.g. after the checklist was edited) are ignored.
 *
 * @param hidden - The hidden keys.
 * @param groups - The groups of the current view.
 */
export function hiddenCount(hidden: HiddenKeys, groups: FilterGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total +
      group.items.filter(item => isHidden(hidden, group.key, item.id)).length,
    0,
  );
}

/**
 * Removes the hidden items from the categories of the "by category" view.
 * Categories that end up without visible items are dropped.
 *
 * @param categories - The checklist categories.
 * @param hidden - The hidden keys.
 * @returns The categories unchanged when nothing is hidden.
 */
export function filterCategories(
  categories: ChecklistCategory[],
  hidden: HiddenKeys,
): ChecklistCategory[] {
  if (hidden.size === 0) {
    return categories;
  }
  return categories
    .map(category => ({
      ...category,
      items: category.items.filter(
        item => !isHidden(hidden, String(category.id), item.id),
      ),
    }))
    .filter(category => category.items.length > 0);
}

/**
 * Removes the hidden items from the groups of the "by storage location"
 * view. Groups that end up without units are dropped.
 *
 * @param groups - The storage groups.
 * @param hidden - The hidden keys.
 * @returns The groups unchanged when nothing is hidden.
 */
export function filterStorageGroups(
  groups: StorageGroup[],
  hidden: HiddenKeys,
): StorageGroup[] {
  if (hidden.size === 0) {
    return groups;
  }
  return groups
    .map(group => ({
      ...group,
      units: group.units.filter(
        unit => !isHidden(hidden, group.key, unit.item.id),
      ),
    }))
    .filter(group => group.units.length > 0);
}
