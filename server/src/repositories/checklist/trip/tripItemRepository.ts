import type {
  ChecklistItem,
  ChecklistItemBody,
  UpdateTripChecklistItemBody,
} from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { withTransaction } from '../../../utils/withTransaction';
import {
  nextSiblingOrder,
  reorderSiblings,
  type ReorderResult,
} from '../shared/siblingOrder';

import { fetchSpecsByItemIds, TripChecklistItemRow } from './shared';

/** Confirms a checklist item belongs to the given trip (via its category). */
export async function verifyItemBelongsToTrip(
  itemId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT cti.id FROM checklist_trip_items cti
     JOIN checklist_trip_categories ctc ON ctc.id = cti.checklist_trip_category_id
     WHERE cti.id = ? AND ctc.trip_id = ?`,
    [itemId, tripId],
  );
  return rows.length > 0;
}

/** Appends a new item to a trip checklist category. */
export async function createTripItem(
  catId: number,
  data: ChecklistItemBody,
): Promise<ChecklistItem> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location, sort_order) SELECT ?, ?, ?, ?, ?, COALESCE(MAX(sort_order) + 1, 0) FROM checklist_trip_items WHERE checklist_trip_category_id = ?',
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

/** Deletes a trip checklist item by id. */
export async function deleteTripItem(itemId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_trip_items WHERE id = ?',
    [itemId],
  );
  return result.affectedRows > 0;
}

/**
 * Partially updates a single trip checklist item: any of name, quantity,
 * notes and storage location present in `data` is overwritten (a blank name
 * keeps the current one); absent fields keep their stored values.
 *
 * @param itemId - Id of the item to update.
 * @param data - Fields to change.
 * @returns The updated item with its specs, or null if it does not exist.
 */
export async function updateTripItem(
  itemId: number,
  data: UpdateTripChecklistItemBody,
): Promise<ChecklistItem | null> {
  const [rows] = await pool.execute<TripChecklistItemRow[]>(
    'SELECT * FROM checklist_trip_items WHERE id = ?',
    [itemId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];
  const name = 'name' in data && data.name ? data.name : cur.name;
  const quantity = 'quantity' in data ? (data.quantity ?? null) : cur.quantity;
  const notes = 'notes' in data ? (data.notes ?? null) : cur.notes;
  const storage_location =
    'storage_location' in data
      ? (data.storage_location ?? null)
      : cur.storage_location;

  await pool.execute(
    'UPDATE checklist_trip_items SET name = ?, quantity = ?, notes = ?, storage_location = ? WHERE id = ?',
    [name, quantity, notes, storage_location, itemId],
  );

  const specsByItemId = await fetchSpecsByItemIds([itemId]);

  return {
    id: cur.id,
    name,
    quantity,
    notes,
    storage_location,
    specs: specsByItemId.get(itemId) ?? [],
  };
}

/**
 * Sets the checked state for an item within an occasion.
 * Inserts or updates to checked=1 when true; removes the row when false
 * so the checks map stays sparse (only true entries).
 */
export async function setCheck(
  occId: number,
  itemId: number,
  checked: boolean,
): Promise<void> {
  if (checked) {
    await pool.execute(
      `INSERT INTO checklist_checks (checklist_occasion_id, checklist_trip_item_id, checked)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE checked = 1`,
      [occId, itemId],
    );
  } else {
    await pool.execute(
      'DELETE FROM checklist_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_id = ?',
      [occId, itemId],
    );
  }
}

/**
 * Renumbers the items of a trip checklist category to match `orderedIds`.
 *
 * @param catId - Category whose items are reordered.
 * @param orderedIds - Every item id of the category, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not
 *   exactly the set of the category's item ids.
 */
export function reorderTripItems(
  catId: number,
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return reorderSiblings('checklist_trip_items', catId, orderedIds);
}

/** Outcome of {@link moveTripItem}. */
export type MoveTripItemResult =
  'moved' | 'item_not_found' | 'category_not_found';

/**
 * Moves a trip checklist item to the end of another category of the same
 * trip. The item keeps its id, so its specs and check marks stay attached.
 *
 * @param tripId - Trip both the item and the target category must belong to.
 * @param itemId - Item to move.
 * @param targetCatId - Category receiving the item.
 * @returns `moved` on success, or which ownership check failed.
 */
export function moveTripItem(
  tripId: number,
  itemId: number,
  targetCatId: number,
): Promise<MoveTripItemResult> {
  return withTransaction<MoveTripItemResult>(async conn => {
    const [catRows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM checklist_trip_categories WHERE id = ? AND trip_id = ? FOR UPDATE',
      [targetCatId, tripId],
    );
    if (catRows.length === 0) {
      return 'category_not_found';
    }
    const [itemRows] = await conn.execute<RowDataPacket[]>(
      `SELECT cti.id FROM checklist_trip_items cti
       JOIN checklist_trip_categories ctc ON ctc.id = cti.checklist_trip_category_id
       WHERE cti.id = ? AND ctc.trip_id = ? FOR UPDATE`,
      [itemId, tripId],
    );
    if (itemRows.length === 0) {
      return 'item_not_found';
    }
    const sortOrder = await nextSiblingOrder(
      conn,
      'checklist_trip_items',
      targetCatId,
    );
    await conn.execute(
      'UPDATE checklist_trip_items SET checklist_trip_category_id = ?, sort_order = ? WHERE id = ?',
      [targetCatId, sortOrder, itemId],
    );
    return 'moved';
  });
}
