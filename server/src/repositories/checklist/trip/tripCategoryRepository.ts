import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type { TripChecklistCategoryResponse } from '../../../types/checklist';

/** Appends a new category to a trip checklist. */
export async function createTripCategory(
  tripId: number,
  name: string,
): Promise<TripChecklistCategoryResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
    [tripId, name],
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
