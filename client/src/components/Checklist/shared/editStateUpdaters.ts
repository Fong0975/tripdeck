import type { RefObject } from 'react';

import type { ChecklistCategory } from '@/types';

import type { EditableEntity } from './checklistDiffSync';
import { nextTempId } from './checklistUtils';
import type { EditCategory, EditItem, EditSpec } from './types';

/**
 * Converts a loaded checklist category (template or trip) into the local
 * edit-state shape, normalising optional fields to `null`.
 *
 * @param cat - The category as returned by the API.
 * @returns A fresh edit-state category tree (items → specs).
 */
export function toEditCategory(cat: ChecklistCategory): EditCategory {
  return {
    id: cat.id,
    name: cat.name,
    items: cat.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? null,
      notes: item.notes ?? null,
      storage_location: item.storage_location ?? null,
      specs: (item.specs ?? []).map(spec => ({
        id: spec.id,
        name: spec.name,
        storage_location: spec.storage_location,
      })),
    })),
  };
}

/** Creates a new, unsaved item with a negative temp id and default name. */
export function newEditItem(): EditItem {
  return {
    id: nextTempId(),
    name: '新項目',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
  };
}

/** Creates a new, unsaved spec with a negative temp id and default name. */
export function newEditSpec(): EditSpec {
  return {
    id: nextTempId(),
    name: '新規格',
    storage_location: null,
  };
}

/**
 * Returns a copy of `list` with the entry whose id is `id` replaced by
 * `fn(entry)`; other entries are kept by reference.
 */
export function updateById<T extends { id: number }>(
  list: T[],
  id: number,
  fn: (entry: T) => T,
): T[] {
  return list.map(entry => (entry.id === id ? fn(entry) : entry));
}

/**
 * Removes an entry locally following the checklist editing convention:
 * unsaved entries (negative temp id) are dropped outright, while saved ones
 * are flagged `_deleted` so the save step can issue the delete call.
 */
export function removeOrMarkDeleted<T extends EditableEntity>(
  list: T[],
  id: number,
): T[] {
  if (id < 0) {
    return list.filter(entry => entry.id !== id);
  }
  return updateById(list, id, entry => ({ ...entry, _deleted: true }));
}

/**
 * Moves the entry `activeId` to the position currently held by `overId`,
 * shifting the entries in between (the semantics of drag-and-drop sorting).
 * Returns the same array when either id is missing or both are equal.
 */
export function reorderById<T extends { id: number }>(
  list: T[],
  activeId: number,
  overId: number,
): T[] {
  const from = list.findIndex(entry => entry.id === activeId);
  const to = list.findIndex(entry => entry.id === overId);
  if (from < 0 || to < 0 || from === to) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Moves the item `itemId` from one category of a categories → items tree to
 * the end of another. Returns the same tree when the categories are equal
 * or the item is not in the source category.
 */
export function moveItemToCategory(
  categories: EditCategory[],
  itemId: number,
  fromCatId: number,
  toCatId: number,
): EditCategory[] {
  const item = categories
    .find(cat => cat.id === fromCatId)
    ?.items.find(entry => entry.id === itemId);
  if (!item || fromCatId === toCatId) {
    return categories;
  }
  return categories.map(cat => {
    if (cat.id === fromCatId) {
      return { ...cat, items: cat.items.filter(entry => entry.id !== itemId) };
    }
    if (cat.id === toCatId) {
      return { ...cat, items: [...cat.items, item] };
    }
    return cat;
  });
}

/** Returns an updater that shallow-merges `fields` into an entry. */
export function patchFields<T>(fields: Partial<T>): (entry: T) => T {
  return entry => ({ ...entry, ...fields });
}

/**
 * Returns an item updater that appends `spec` to the item's specs. An item
 * with specs holds no storage location of its own, so the first spec takes
 * over the location the item had and the item's own is cleared.
 */
export function appendSpec(spec: EditSpec): (item: EditItem) => EditItem {
  return item => {
    if (item.specs.length > 0) {
      return { ...item, specs: [...item.specs, spec] };
    }
    return {
      ...item,
      storage_location: null,
      specs: [{ ...spec, storage_location: item.storage_location }],
    };
  };
}

/** Returns an item updater that merges `fields` into the spec `specId`. */
export function patchSpec(
  specId: number,
  fields: Partial<EditSpec>,
): (item: EditItem) => EditItem {
  return item => ({
    ...item,
    specs: updateById(item.specs, specId, patchFields(fields)),
  });
}

/** Returns an item updater that drops the spec `specId` from the item. */
export function removeSpecById(specId: number): (item: EditItem) => EditItem {
  return item => ({
    ...item,
    specs: item.specs.filter(spec => spec.id !== specId),
  });
}

/**
 * Immutably updates one node of a categories → items tree.
 *
 * - `updateIn(categories, catId, fn)` replaces the category `catId` with
 *   `fn(category)`.
 * - `updateIn(categories, catId, itemId, fn)` replaces the item `itemId`
 *   inside the category `catId` with `fn(item)`.
 *
 * Untouched categories and items are kept by reference.
 */
export function updateIn(
  categories: EditCategory[],
  catId: number,
  fn: (category: EditCategory) => EditCategory,
): EditCategory[];
export function updateIn(
  categories: EditCategory[],
  catId: number,
  itemId: number,
  fn: (item: EditItem) => EditItem,
): EditCategory[];
export function updateIn(
  categories: EditCategory[],
  catId: number,
  itemIdOrFn: number | ((category: EditCategory) => EditCategory),
  itemFn?: (item: EditItem) => EditItem,
): EditCategory[] {
  if (typeof itemIdOrFn === 'function') {
    return updateById(categories, catId, itemIdOrFn);
  }
  if (!itemFn) {
    return categories;
  }
  return updateById(categories, catId, cat => ({
    ...cat,
    items: updateById(cat.items, itemIdOrFn, itemFn),
  }));
}

/**
 * Smooth-scrolls the referenced element to its bottom on the next tick, so
 * a just-appended row (rendered after the state update) becomes visible.
 */
export function scrollToBottomSoon(ref: RefObject<HTMLElement | null>): void {
  setTimeout(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: 'smooth',
    });
  }, 0);
}
