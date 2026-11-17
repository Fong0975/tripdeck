import type { ChecklistCategory } from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { reorderSiblings, type ReorderResult } from '../shared/siblingOrder';

/** Appends a new category to a trip checklist. */
export async function createTripCategory(
  tripId: number,
  name: string,
): Promise<ChecklistCategory> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) SELECT ?, ?, COALESCE(MAX(sort_order) + 1, 0) FROM checklist_trip_categories WHERE trip_id = ?',
    [tripId, name, tripId],
  );

  return { id: result.insertId, name, items: [] };
}

/** Updates the name of a trip checklist category. */
export async function updateTripCategory(
  catId: number,
  name: string,
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE checklist_trip_categories SET name = ? WHERE id = ?',
    [name, catId],
  );
  return result.affectedRows > 0;
}

/** Deletes a trip checklist category and all its items. */
export async function deleteTripCategory(catId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_trip_categories WHERE id = ?',
    [catId],
  );
  return result.affectedRows > 0;
}

/** Confirms a trip checklist category belongs to the given trip. */
export async function verifyCategoryBelongsToTrip(
  catId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_trip_categories WHERE id = ? AND trip_id = ?',
    [catId, tripId],
  );
  return rows.length > 0;
}

/**
 * Renumbers the categories of a trip checklist to match `orderedIds`.
 *
 * @param tripId - Trip whose categories are reordered.
 * @param orderedIds - Every category id of the trip, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not
 *   exactly the set of the trip's category ids.
 */
export function reorderTripCategories(
  tripId: number,
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return reorderSiblings('checklist_trip_categories', tripId, orderedIds);
}
