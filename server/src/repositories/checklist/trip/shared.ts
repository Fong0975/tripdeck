import type { ItemSpec } from '@tripdeck/shared';
import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../../config/database';
import { placeholders } from '../../../utils/sql';
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

export interface SpecCheckRow extends RowDataPacket {
  checklist_occasion_id: number;
  checklist_trip_item_spec_id: number;
}

// --- Helpers ---

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
): Promise<Map<number, ItemSpec[]>> {
  return tripSpecRepository.fetchByItemIds(itemIds);
}

/**
 * Loads the checked specs of the given occasions, grouped by occasion id.
 * Only checked=1 rows are read; missing entries are implicitly unchecked.
 *
 * @param occIds - Occasion ids.
 * @returns Map of occasion id to its spec id -> true map. Occasions without
 *   any checked spec have no entry.
 */
export async function fetchSpecChecksByOccasionIds(
  occIds: number[],
): Promise<Map<number, Record<number, boolean>>> {
  const byOccId = new Map<number, Record<number, boolean>>();
  if (occIds.length === 0) {
    return byOccId;
  }
  const [rows] = await pool.execute<SpecCheckRow[]>(
    `SELECT checklist_occasion_id, checklist_trip_item_spec_id
     FROM checklist_spec_checks
     WHERE checklist_occasion_id IN (${placeholders(occIds.length)}) AND checked = 1`,
    occIds,
  );
  for (const row of rows) {
    const map = byOccId.get(row.checklist_occasion_id) ?? {};
    map[row.checklist_trip_item_spec_id] = true;
    byOccId.set(row.checklist_occasion_id, map);
  }
  return byOccId;
}
