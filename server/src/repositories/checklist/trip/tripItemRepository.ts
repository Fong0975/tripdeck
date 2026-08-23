import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type {
  CreateTripItemBody,
  TripChecklistItemResponse,
  UpdateTripItemBody,
} from '../../../types/checklist';

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
  data: CreateTripItemBody,
): Promise<TripChecklistItemResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
    [
      catId,
      data.name,
      data.quantity ?? null,
      data.notes ?? null,
      data.storage_location ?? null,
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
 * Updates quantity and/or notes for a single trip checklist item.
 */
export async function updateTripItem(
  itemId: number,
  data: UpdateTripItemBody,
): Promise<TripChecklistItemResponse | null> {
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
