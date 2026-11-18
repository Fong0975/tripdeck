import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../../logger';
import { withTransaction } from '../../../utils/withTransaction';

import { lockTrip } from './shared';
import { copyTemplateIntoTrip } from './templateCopy';
import { insertDefaultOccasion } from './tripChecklistSeed';

const logger = createLogger('checklist-trip');

/** Outcome of {@link syncChecklistFromTemplate}. */
export type SyncTemplateResult = 'synced' | 'not_found' | 'has_categories';

/**
 * Returns whether `table` holds at least one row for the trip, read on the
 * transaction's connection so it observes the locked state.
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
 * Copies the current global template into a trip that has no checklist
 * categories yet, e.g. a trip created before checklists were built at trip
 * creation, or one whose categories were all deleted.
 *
 * Runs in one transaction that first locks the parent trip row, so two
 * concurrent syncs cannot both pass the "no categories" check and duplicate
 * the template. The default occasion is only added when the trip has none,
 * so existing occasions and their checks are kept.
 *
 * @param tripId - Trip to sync.
 * @returns `'synced'` on success (even when the template is empty),
 *   `'not_found'` when the trip does not exist, `'has_categories'` when the
 *   trip already has categories and nothing was changed.
 * @throws Re-throws database errors after the transaction is rolled back.
 */
export async function syncChecklistFromTemplate(
  tripId: number,
): Promise<SyncTemplateResult> {
  try {
    return await withTransaction(async conn => {
      if (!(await lockTrip(conn, tripId))) {
        return 'not_found';
      }
      if (await hasTripRows(conn, 'checklist_trip_categories', tripId)) {
        return 'has_categories';
      }

      const categoriesCopied = await copyTemplateIntoTrip(conn, tripId);
      if (!(await hasTripRows(conn, 'checklist_occasions', tripId))) {
        await insertDefaultOccasion(conn, tripId);
      }
      logger.info('Trip checklist synced from template', {
        tripId,
        categoriesCopied,
      });
      return 'synced';
    });
  } catch (err) {
    logger.error(
      'Failed to sync trip checklist from template, rolled back',
      { tripId },
      err,
    );
    throw err;
  }
}
