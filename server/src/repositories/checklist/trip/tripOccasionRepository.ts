import type { ChecklistOccasion } from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { withTransaction } from '../../../utils/withTransaction';

import {
  CheckRow,
  fetchSpecChecksByOccasionIds,
  lockTrip,
  OccasionRow,
} from './shared';

/** Confirms an occasion belongs to the given trip. */
export async function verifyOccasionBelongsToTrip(
  occId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_occasions WHERE id = ? AND trip_id = ?',
    [occId, tripId],
  );
  return rows.length > 0;
}

export async function createOccasion(
  tripId: number,
  name: string,
): Promise<ChecklistOccasion> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
    [tripId, name],
  );
  return { id: result.insertId, name, checks: {}, specChecks: {} };
}

export async function updateOccasion(
  occId: number,
  name: string,
): Promise<ChecklistOccasion | null> {
  const [rows] = await pool.execute<OccasionRow[]>(
    'SELECT * FROM checklist_occasions WHERE id = ?',
    [occId],
  );
  if (rows.length === 0) {
    return null;
  }

  await pool.execute('UPDATE checklist_occasions SET name = ? WHERE id = ?', [
    name,
    occId,
  ]);

  const [checkRows] = await pool.execute<CheckRow[]>(
    'SELECT checklist_trip_item_id FROM checklist_checks WHERE checklist_occasion_id = ? AND checked = 1',
    [occId],
  );
  const checks: Record<number, boolean> = {};
  for (const row of checkRows) {
    checks[row.checklist_trip_item_id] = true;
  }

  const specChecks = (await fetchSpecChecksByOccasionIds([occId])).get(occId);

  return { id: occId, name, checks, specChecks: specChecks ?? {} };
}

/** Outcome of {@link deleteOccasionIfNotLast}. */
export type DeleteOccasionResult = 'deleted' | 'not_found' | 'last_occasion';

/**
 * Deletes an occasion unless it is the trip's last remaining one.
 *
 * The count and the delete run in one transaction that first locks the parent
 * trip row, so two concurrent deletes cannot both pass the count check and
 * leave the trip with zero occasions.
 *
 * @param tripId - Trip the occasion must belong to.
 * @param occId - Occasion to delete.
 * @returns `'deleted'` on success, `'not_found'` when the trip or the occasion
 *   (within that trip) does not exist, `'last_occasion'` when it is the only
 *   occasion left.
 */
export async function deleteOccasionIfNotLast(
  tripId: number,
  occId: number,
): Promise<DeleteOccasionResult> {
  return withTransaction(async conn => {
    if (!(await lockTrip(conn, tripId))) {
      return 'not_found';
    }
    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM checklist_occasions WHERE trip_id = ?',
      [tripId],
    );
    if (!rows.some(row => row.id === occId)) {
      return 'not_found';
    }
    if (rows.length <= 1) {
      return 'last_occasion';
    }
    await conn.execute('DELETE FROM checklist_occasions WHERE id = ?', [occId]);
    return 'deleted';
  });
}
