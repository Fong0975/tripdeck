import type { ChecklistCategory, ChecklistItem } from '@/types';

import type { SyncTracker } from './checklistDiffSync';
import type { EditCategory } from './types';

/** A saved item that now sits in a different category than it was loaded in. */
export interface ItemMove {
  /** The item as originally loaded, so later diffs compare against it. */
  item: ChecklistItem;
  fromCatId: number;
  /** Edited id of the target category; negative while it is still unsaved. */
  toCatId: number;
}

/**
 * Finds the saved items that were moved between categories in the draft.
 * Unsaved items are not moves: they are simply created where they sit.
 * Moves are listed in draft order, so appending them in that order leaves
 * each target category in the order the user arranged.
 *
 * @param originals - The categories as loaded when editing started.
 * @param edited - The draft categories.
 * @returns One entry per saved, non-deleted item whose category changed.
 */
export function planItemMoves(
  originals: ChecklistCategory[],
  edited: EditCategory[],
): ItemMove[] {
  const origin = new Map<number, { item: ChecklistItem; catId: number }>();
  for (const cat of originals) {
    for (const item of cat.items) {
      origin.set(item.id, { item, catId: cat.id });
    }
  }
  const moves: ItemMove[] = [];
  for (const cat of edited.filter(c => !c._deleted)) {
    for (const item of cat.items.filter(i => !i._deleted && i.id > 0)) {
      const from = origin.get(item.id);
      if (from && from.catId !== cat.id) {
        moves.push({ item: from.item, fromCatId: from.catId, toCatId: cat.id });
      }
    }
  }
  return moves;
}

/**
 * Returns the items each category holds once `moves` are applied, keyed by
 * saved category id. Diffing a category's draft against this (instead of
 * the loaded items) keeps moved items from being deleted from their old
 * category or re-created in the new one.
 *
 * @param originals - The categories as loaded when editing started.
 * @param moves - The planned moves.
 * @param resolveCatId - Maps an edited category id to its saved id.
 */
export function itemsAfterMoves(
  originals: ChecklistCategory[],
  moves: ItemMove[],
  resolveCatId: (editedCatId: number) => number,
): Map<number, ChecklistItem[]> {
  const items = new Map(originals.map(cat => [cat.id, [...cat.items]]));
  for (const move of moves) {
    items.set(
      move.fromCatId,
      (items.get(move.fromCatId) ?? []).filter(i => i.id !== move.item.id),
    );
    const target = resolveCatId(move.toCatId);
    items.set(target, [...(items.get(target) ?? []), move.item]);
  }
  return items;
}

/** Side effects needed to carry out moves; see {@link applyItemMoves}. */
export interface ItemMoveIo {
  /** The draft categories, used to create unsaved move targets. */
  editedCategories: EditCategory[];
  /** Tracker of the category sync, shared so created targets are not duplicated. */
  categoryTracker: SyncTracker<ChecklistCategory>;
  /** Ids of items whose move already succeeded in this edit session. */
  movedItemIds: Set<number>;
  createCategory: (edited: EditCategory) => Promise<ChecklistCategory>;
  moveItem: (itemId: number, targetCatId: number) => Promise<void>;
}

/**
 * Performs the planned moves. Unsaved target categories are created first
 * and recorded in the category tracker, so the later category sync treats
 * them as already added. Moves that already succeeded are skipped, which
 * makes a retry after a partial failure safe.
 *
 * @param moves - The planned moves.
 * @param io - The API side effects and retry trackers.
 * @returns Maps an edited category id to its saved id.
 */
export async function applyItemMoves(
  moves: ItemMove[],
  io: ItemMoveIo,
): Promise<(editedCatId: number) => number> {
  const resolveCatId = (editedCatId: number) =>
    editedCatId > 0
      ? editedCatId
      : (io.categoryTracker.added.get(editedCatId)?.id ?? editedCatId);

  for (const move of moves) {
    if (move.toCatId < 0 && !io.categoryTracker.added.has(move.toCatId)) {
      const target = io.editedCategories.find(c => c.id === move.toCatId);
      if (target) {
        io.categoryTracker.added.set(
          move.toCatId,
          await io.createCategory(target),
        );
      }
    }
    if (!io.movedItemIds.has(move.item.id)) {
      await io.moveItem(move.item.id, resolveCatId(move.toCatId));
      io.movedItemIds.add(move.item.id);
    }
  }
  return resolveCatId;
}
