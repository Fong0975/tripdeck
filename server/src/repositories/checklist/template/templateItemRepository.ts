import type { ChecklistItem, ChecklistItemBody } from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { withTransaction } from '../../../utils/withTransaction';
import {
  nextSiblingOrder,
  reorderSiblings,
  type ReorderResult,
} from '../shared/siblingOrder';

import { fetchSpecsByItemIds, TemplateItemRow, toItemResponse } from './shared';

export async function createItem(
  catId: number,
  data: ChecklistItemBody,
): Promise<ChecklistItem | null> {
  const [catRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  if (catRows.length === 0) {
    return null;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_items (checklist_template_category_id, name, quantity, notes, storage_location, sort_order) SELECT ?, ?, ?, ?, ?, COALESCE(MAX(sort_order) + 1, 0) FROM checklist_template_items WHERE checklist_template_category_id = ?',
    [
      catId,
      data.name,
      data.quantity ?? null,
      data.notes ?? null,
      data.storage_location ?? null,
      catId,
    ],
  );

  return {
    id: result.insertId,
    name: data.name,
    quantity: data.quantity ?? null,
    notes: data.notes ?? null,
    storage_location: data.storage_location ?? null,
    specs: [],
  };
}

export async function updateItem(
  itemId: number,
  data: ChecklistItemBody,
): Promise<ChecklistItem | null> {
  const [rows] = await pool.execute<TemplateItemRow[]>(
    'SELECT * FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];
  const quantity = 'quantity' in data ? (data.quantity ?? null) : cur.quantity;
  const notes = 'notes' in data ? (data.notes ?? null) : cur.notes;
  const specs = (await fetchSpecsByItemIds([itemId])).get(itemId) ?? [];
  const requestedLocation =
    'storage_location' in data
      ? (data.storage_location ?? null)
      : cur.storage_location;
  // An item with specs holds no location of its own; its specs carry them.
  const storage_location = specs.length > 0 ? null : requestedLocation;

  await pool.execute(
    'UPDATE checklist_template_items SET name = ?, quantity = ?, notes = ?, storage_location = ? WHERE id = ?',
    [data.name, quantity, notes, storage_location, itemId],
  );

  return toItemResponse(
    { ...cur, name: data.name, quantity, notes, storage_location },
    specs,
  );
}

export async function deleteItem(itemId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  return result.affectedRows > 0;
}

/**
 * Verifies that an item belongs to a category. Used to validate nested routes.
 */
export async function verifyItemBelongsToCategory(
  itemId: number,
  catId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_items WHERE id = ? AND checklist_template_category_id = ?',
    [itemId, catId],
  );
  return rows.length > 0;
}

/**
 * Renumbers the items of a template category to match `orderedIds`.
 *
 * @param catId - Category whose items are reordered.
 * @param orderedIds - Every item id of the category, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not
 *   exactly the set of the category's item ids.
 */
export function reorderItems(
  catId: number,
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return reorderSiblings('checklist_template_items', catId, orderedIds);
}

/** Outcome of {@link moveItem}. */
export type MoveItemResult = 'moved' | 'item_not_found' | 'category_not_found';

/**
 * Moves a template item to the end of another category. The item keeps its
 * id and specs.
 *
 * @param itemId - Item to move.
 * @param targetCatId - Category receiving the item.
 * @returns `moved` on success, or which lookup failed.
 */
export function moveItem(
  itemId: number,
  targetCatId: number,
): Promise<MoveItemResult> {
  return withTransaction<MoveItemResult>(async conn => {
    const [catRows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM checklist_template_categories WHERE id = ? FOR UPDATE',
      [targetCatId],
    );
    if (catRows.length === 0) {
      return 'category_not_found';
    }
    const sortOrder = await nextSiblingOrder(
      conn,
      'checklist_template_items',
      targetCatId,
    );
    const [result] = await conn.execute<ResultSetHeader>(
      'UPDATE checklist_template_items SET checklist_template_category_id = ?, sort_order = ? WHERE id = ?',
      [targetCatId, sortOrder, itemId],
    );
    return result.affectedRows > 0 ? 'moved' : 'item_not_found';
  });
}
