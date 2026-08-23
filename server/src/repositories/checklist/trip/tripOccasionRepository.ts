import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type { OccasionResponse } from '../../../types/checklist';

import { CheckRow, OccasionRow } from './shared';

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
): Promise<OccasionResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
    [tripId, name],
  );
  return { id: result.insertId, name, checks: {} };
}

export async function updateOccasion(
  occId: number,
  name: string,
): Promise<OccasionResponse | null> {
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

  return { id: occId, name, checks };
}

export async function getOccasionCount(tripId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM checklist_occasions WHERE trip_id = ?',
    [tripId],
  );
  return (rows[0] as { count: number }).count;
}

export async function deleteOccasion(occId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_occasions WHERE id = ?',
    [occId],
  );
  return result.affectedRows > 0;
}
