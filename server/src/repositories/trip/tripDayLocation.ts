import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import type {
  CreateLocationBody,
  DayLocation,
  UpdateLocationBody,
} from '../../types/trip';
import { withTransaction } from '../../utils/withTransaction';
import { nextSortOrderInDay } from '../daySortOrder';

/**
 * Appends a location to the end of a day. The next sort_order is computed
 * and the row inserted in one transaction under a lock on the day row, so
 * concurrent appends never share an order.
 *
 * @param dayId - Day to append to.
 * @param data - New location; its name is trimmed before storing.
 * @returns The created location.
 */
export async function addLocation(
  dayId: number,
  data: CreateLocationBody,
): Promise<DayLocation> {
  const name = data.name.trim();
  const id = await withTransaction(async conn => {
    const sortOrder = await nextSortOrderInDay(
      conn,
      'trip_day_locations',
      dayId,
    );
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO trip_day_locations (trip_day_id, name, sort_order) VALUES (?, ?, ?)',
      [dayId, name, sortOrder],
    );
    return result.insertId;
  });
  return { id, name };
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
