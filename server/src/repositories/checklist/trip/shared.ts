import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../../config/database';
import type { ItemSpecResponse } from '../../../types/checklist';

// --- Row types ---

export interface TripChecklistCategoryRow extends RowDataPacket {
  id: number;
  trip_id: number;
  name: string;
}

export interface TripChecklistItemRow extends RowDataPacket {
  id: number;
  checklist_trip_category_id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  storage_location: string | null;
}

export interface TripItemSpecRow extends RowDataPacket {
  id: number;
  checklist_trip_item_id: number;
  name: string;
  storage_location: string | null;
}

export interface TemplateCategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

export interface TemplateItemRow extends RowDataPacket {
  id: number;
  checklist_template_category_id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  storage_location: string | null;
}

export interface TemplateItemSpecRow extends RowDataPacket {
  id: number;
  checklist_template_item_id: number;
  name: string;
  storage_location: string | null;
}

export interface OccasionRow extends RowDataPacket {
  id: number;
  trip_id: number;
  name: string;
}

export interface CheckRow extends RowDataPacket {
  checklist_occasion_id: number;
  checklist_trip_item_id: number;
}

// --- Helpers ---

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

/**
 * Checks whether a trip row exists.
 *
 * @param tripId - Trip id to look up.
 * @returns True when the trip exists.
 */
export async function tripExists(tripId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM trips WHERE id = ?',
    [tripId],
  );
  return rows.length > 0;
}

/**
 * Takes an exclusive row lock on the parent trip for the rest of the
 * transaction, serializing concurrent checklist structure changes of the
 * same trip.
 *
 * @param conn - Connection with an open transaction.
 * @param tripId - Trip id to lock.
 * @returns True when the trip exists (and is now locked), false otherwise.
 */
export async function lockTrip(
  conn: PoolConnection,
  tripId: number,
): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id FROM trips WHERE id = ? FOR UPDATE',
    [tripId],
  );
  return rows.length > 0;
}

export function toSpecResponse(row: TripItemSpecRow): ItemSpecResponse {
  return {
    id: row.id,
    name: row.name,
    storage_location: row.storage_location,
  };
}

export async function fetchSpecsByItemIds(
  itemIds: number[],
): Promise<Map<number, ItemSpecResponse[]>> {
  const map = new Map<number, ItemSpecResponse[]>();
  if (itemIds.length === 0) {
    return map;
  }
  const [rows] = await pool.execute<TripItemSpecRow[]>(
    `SELECT * FROM checklist_trip_item_specs
     WHERE checklist_trip_item_id IN (${placeholders(itemIds.length)})
     ORDER BY checklist_trip_item_id, id`,
    itemIds,
  );
  for (const row of rows) {
    const list = map.get(row.checklist_trip_item_id) ?? [];
    list.push(toSpecResponse(row));
    map.set(row.checklist_trip_item_id, list);
  }
  return map;
}
