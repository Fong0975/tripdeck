import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import type {
  CreateLocationBody,
  DayLocation,
  UpdateLocationBody,
} from '../../types/trip';

export async function addLocation(
  dayId: number,
  data: CreateLocationBody,
): Promise<DayLocation> {
  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM trip_day_locations WHERE trip_day_id = ?',
    [dayId],
  );
  const sortOrder = (countRows[0].cnt as number) ?? 0;

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO trip_day_locations (trip_day_id, name, sort_order) VALUES (?, ?, ?)',
    [dayId, data.name.trim(), sortOrder],
  );
  return { id: result.insertId, name: data.name.trim() };
}

/**
 * Confirms a day location is reachable through the given trip's days.
 *
 * @param locationId - Day location to check.
 * @param tripId - Trip the location must belong to.
 * @returns True when the location exists under one of the trip's days.
 */
export async function verifyLocationBelongsToTrip(
  locationId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT tdl.id FROM trip_day_locations tdl
     JOIN trip_days td ON td.id = tdl.trip_day_id
     WHERE tdl.id = ? AND td.trip_id = ?`,
    [locationId, tripId],
  );
  return rows.length > 0;
}

export async function updateLocation(
  locationId: number,
  data: UpdateLocationBody,
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE trip_day_locations SET name = ? WHERE id = ?',
    [data.name.trim(), locationId],
  );
  return result.affectedRows > 0;
}

export async function deleteLocation(locationId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trip_day_locations WHERE id = ?',
    [locationId],
  );
  return result.affectedRows > 0;
}
