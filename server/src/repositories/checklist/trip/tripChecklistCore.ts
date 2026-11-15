import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  TripChecklist,
} from '@tripdeck/shared';
import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../../config/database';
import { createLogger } from '../../../logger';
import { placeholders } from '../../../utils/sql';
import { withTransaction } from '../../../utils/withTransaction';

import {
  CheckRow,
  fetchSpecsByItemIds,
  lockTrip,
  OccasionRow,
  TripChecklistCategoryRow,
  TripChecklistItemRow,
} from './shared';
import { copyTemplateIntoTrip } from './templateCopy';

const logger = createLogger('checklist-trip');

/**
 * Returns the full checklist for a trip.
 * Returns null if no occasions exist (checklist not yet initialized).
 */
export async function findChecklist(
  tripId: number,
): Promise<TripChecklist | null> {
  const [occRows] = await pool.execute<OccasionRow[]>(
    'SELECT * FROM checklist_occasions WHERE trip_id = ? ORDER BY id',
    [tripId],
  );
  if (occRows.length === 0) {
    return null;
  }

  const [catRows] = await pool.execute<TripChecklistCategoryRow[]>(
    'SELECT * FROM checklist_trip_categories WHERE trip_id = ? ORDER BY id',
    [tripId],
  );

  const itemsByCatId = new Map<number, ChecklistItem[]>();
  if (catRows.length > 0) {
    const catIds = catRows.map(r => r.id);
    const [itemRows] = await pool.execute<TripChecklistItemRow[]>(
      `SELECT * FROM checklist_trip_items
       WHERE checklist_trip_category_id IN (${placeholders(catIds.length)})
       ORDER BY checklist_trip_category_id, id`,
      catIds,
    );

    const specsByItemId = await fetchSpecsByItemIds(itemRows.map(r => r.id));

    for (const row of itemRows) {
      const list = itemsByCatId.get(row.checklist_trip_category_id) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        notes: row.notes,
        storage_location: row.storage_location,
        specs: specsByItemId.get(row.id) ?? [],
      });
      itemsByCatId.set(row.checklist_trip_category_id, list);
    }
  }

  const categories: ChecklistCategory[] = catRows.map(row => ({
    id: row.id,
    name: row.name,
    items: itemsByCatId.get(row.id) ?? [],
  }));

  // Fetch only checked=1 rows; missing entries are implicitly unchecked.
  const occIds = occRows.map(r => r.id);
  const checksByOccId = new Map<number, Record<number, boolean>>();
  if (occIds.length > 0) {
    const [checkRows] = await pool.execute<CheckRow[]>(
      `SELECT checklist_occasion_id, checklist_trip_item_id
       FROM checklist_checks
       WHERE checklist_occasion_id IN (${placeholders(occIds.length)}) AND checked = 1`,
      occIds,
    );
    for (const row of checkRows) {
      const map = checksByOccId.get(row.checklist_occasion_id) ?? {};
      map[row.checklist_trip_item_id] = true;
      checksByOccId.set(row.checklist_occasion_id, map);
    }
  }

  const occasions: ChecklistOccasion[] = occRows.map(row => ({
    id: row.id,
    name: row.name,
    checks: checksByOccId.get(row.id) ?? {},
  }));

  return { tripId, categories, occasions };
}

/**
 * Returns whether `table` already holds at least one row for the trip,
 * read on the transaction's connection so it observes the locked state.
 */
async function hasTripRows(
  conn: PoolConnection,
  table: 'checklist_occasions' | 'checklist_trip_categories',
  tripId: number,
): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE trip_id = ? LIMIT 1`,
    [tripId],
  );
  return rows.length > 0;
}

/**
 * Initializes a trip checklist from the current template and creates a
 * default occasion, unless another request already did so.
 *
 * Runs in one transaction that first locks the parent trip row, so concurrent
 * callers (e.g. a double-fetch on page load) are serialized and only the
 * first one copies the template; later ones see the rows it committed.
 * Template categories are only copied when the trip has none yet, so a
 * partially initialized checklist never receives duplicates.
 *
 * @param tripId - Trip whose checklist to initialize.
 * @returns The assembled checklist, or null when the trip does not exist.
 * @throws Re-throws database errors after the transaction is rolled back.
 */
export async function initChecklist(
  tripId: number,
): Promise<TripChecklist | null> {
  let tripFound: boolean;
  try {
    tripFound = await withTransaction(async conn => {
      if (!(await lockTrip(conn, tripId))) {
        return false;
      }
      if (await hasTripRows(conn, 'checklist_occasions', tripId)) {
        logger.debug('Trip checklist already initialized by another request', {
          tripId,
        });
        return true;
      }

      const hasCategories = await hasTripRows(
        conn,
        'checklist_trip_categories',
        tripId,
      );
      const categoriesCopied = hasCategories
        ? 0
        : await copyTemplateIntoTrip(conn, tripId);

      await conn.execute(
        "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')",
        [tripId],
      );
      logger.info('Trip checklist initialized from template', {
        tripId,
        categoriesCopied,
      });
      return true;
    });
  } catch (err) {
    logger.error(
      'Failed to initialize trip checklist, rolled back',
      { tripId },
      err,
    );
    throw err;
  }

  if (!tripFound) {
    logger.warn('Cannot initialize checklist: trip not found', { tripId });
    return null;
  }
  return findChecklist(tripId);
}

/**
 * Returns the existing checklist or initializes one from the current template
 * if none exists yet.
 *
 * @param tripId - Trip whose checklist to return.
 * @returns The checklist, or null when the trip does not exist.
 */
export async function findOrInitChecklist(
  tripId: number,
): Promise<TripChecklist | null> {
  const existing = await findChecklist(tripId);
  if (existing) {
    return existing;
  }
  logger.debug('No checklist found, auto-initializing from template', {
    tripId,
  });
  return initChecklist(tripId);
}
