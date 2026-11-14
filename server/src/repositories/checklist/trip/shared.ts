import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../../config/database';
import type { ItemSpecResponse } from '../../../types/checklist';
import { createSpecRepository } from '../shared/specRepository';

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

/** Spec operations bound to the trip checklist spec table. */
export const tripSpecRepository = createSpecRepository({
  specTable: 'checklist_trip_item_specs',
  itemTable: 'checklist_trip_items',
  parentColumn: 'checklist_trip_item_id',
});

/**
 * Loads the specs of the given trip checklist items, grouped by item id.
 *
 * @param itemIds - Trip checklist item ids.
 * @returns Map of item id to its specs, ordered by spec id.
 */
export function fetchSpecsByItemIds(
  itemIds: number[],
): Promise<Map<number, ItemSpecResponse[]>> {
  return tripSpecRepository.fetchByItemIds(itemIds);
}
