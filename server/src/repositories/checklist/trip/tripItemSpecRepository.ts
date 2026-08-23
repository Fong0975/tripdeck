import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type {
  CreateSpecBody,
  ItemSpecResponse,
  UpdateSpecBody,
} from '../../../types/checklist';

import { toSpecResponse, TripItemSpecRow } from './shared';

export async function createTripItemSpec(
  itemId: number,
  data: CreateSpecBody,
): Promise<ItemSpecResponse | null> {
  const [itemRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_trip_items WHERE id = ?',
    [itemId],
  );
  if (itemRows.length === 0) {
    return null;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
    [itemId, data.name, data.storage_location ?? null],
  );

  return {
    id: result.insertId,
    name: data.name,
    storage_location: data.storage_location ?? null,
  };
}

export async function updateTripItemSpec(
  specId: number,
  data: UpdateSpecBody,
): Promise<ItemSpecResponse | null> {
  const [rows] = await pool.execute<TripItemSpecRow[]>(
    'SELECT * FROM checklist_trip_item_specs WHERE id = ?',
    [specId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];
  const storage_location =
    'storage_location' in data
      ? (data.storage_location ?? null)
      : cur.storage_location;

  await pool.execute(
    'UPDATE checklist_trip_item_specs SET name = ?, storage_location = ? WHERE id = ?',
    [data.name, storage_location, specId],
  );

  return toSpecResponse({ ...cur, name: data.name, storage_location });
}

export async function deleteTripItemSpec(specId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_trip_item_specs WHERE id = ?',
    [specId],
  );
  return result.affectedRows > 0;
}

export async function verifyTripSpecBelongsToItem(
  specId: number,
  itemId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_trip_item_specs WHERE id = ? AND checklist_trip_item_id = ?',
    [specId, itemId],
  );
  return rows.length > 0;
}
