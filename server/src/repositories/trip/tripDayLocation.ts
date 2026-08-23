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
