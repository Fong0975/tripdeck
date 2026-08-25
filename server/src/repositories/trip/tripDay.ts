import type { ResultSetHeader } from 'mysql2';

import pool from '../../config/database';

import { toDateString } from './helpers';
import { TripDayRow } from './types';

/** Finds a day only if it belongs to the given trip. */
export async function findDayByIdAndTripId(
  tripId: number,
  dayId: number,
): Promise<{ id: number; day: number; date: string } | null> {
  const [rows] = await pool.execute<TripDayRow[]>(
    'SELECT * FROM trip_days WHERE id = ? AND trip_id = ?',
    [dayId, tripId],
  );
  if (rows.length === 0) {
    return null;
  }
  return {
    id: rows[0].id,
    day: rows[0].day,
    date: toDateString(rows[0].date),
  };
}

/** Updates a day's free-text notes. */
export async function updateDayNotes(
  dayId: number,
  notes: string | null,
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE trip_days SET notes = ? WHERE id = ?',
    [notes, dayId],
  );
  return result.affectedRows > 0;
}
