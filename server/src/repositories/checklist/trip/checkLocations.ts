import { getEffectiveLocations } from '@tripdeck/shared';
import type { RowDataPacket } from 'mysql2';

import pool from '../../../config/database';

interface StorageLocationRow extends RowDataPacket {
  storage_location: string | null;
}

/**
 * Lists the locations a trip checklist item can be checked at.
 *
 * @param itemId - Trip checklist item id.
 * @returns The item's effective locations; `['']` when it has none or does
 *   not exist.
 */
export async function getItemCheckLocations(itemId: number): Promise<string[]> {
  const [rows] = await pool.execute<StorageLocationRow[]>(
    'SELECT storage_location FROM checklist_trip_items WHERE id = ?',
    [itemId],
  );
  return getEffectiveLocations(rows[0]?.storage_location);
}

/**
 * Lists the locations a trip checklist spec can be checked at. A spec
 * without a location of its own follows its item.
 *
 * @param specId - Trip checklist item spec id.
 * @returns The spec's effective locations; `['']` when it has none or does
 *   not exist.
 */
export async function getSpecCheckLocations(specId: number): Promise<string[]> {
  const [rows] = await pool.execute<StorageLocationRow[]>(
    `SELECT COALESCE(s.storage_location, i.storage_location) AS storage_location
     FROM checklist_trip_item_specs s
     JOIN checklist_trip_items i ON i.id = s.checklist_trip_item_id
     WHERE s.id = ?`,
    [specId],
  );
  return getEffectiveLocations(rows[0]?.storage_location);
}
