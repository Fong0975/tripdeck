import type { ResultSetHeader } from 'mysql2';

import pool from '../config/database';
import { createLogger } from '../logger';

const logger = createLogger('db');

/**
 * One statement per ordered checklist table. A sibling group that still has
 * every sort_order at the column default (0) and more than one row has never
 * been ordered, so its rows get `sort_order = id` to keep the creation order
 * they were displayed in before the column existed.
 *
 * Groups the user has reordered always contain a non-zero value (reorders
 * write 0..n-1 for n > 1), so they are never touched and the statements stay
 * idempotent. The derived table is required because MySQL refuses to select
 * from the table being updated.
 */
const BACKFILL_STATEMENTS: ReadonlyArray<{ table: string; sql: string }> = [
  {
    table: 'checklist_template_categories',
    sql: `UPDATE checklist_template_categories SET sort_order = id
          WHERE EXISTS (
            SELECT 1 FROM (
              SELECT COUNT(*) AS n, MAX(sort_order) AS max_order
              FROM checklist_template_categories
            ) g WHERE g.n > 1 AND g.max_order = 0
          )`,
  },
  {
    table: 'checklist_template_items',
    sql: `UPDATE checklist_template_items SET sort_order = id
          WHERE checklist_template_category_id IN (
            SELECT g.parent_id FROM (
              SELECT checklist_template_category_id AS parent_id
              FROM checklist_template_items
              GROUP BY checklist_template_category_id
              HAVING COUNT(*) > 1 AND MAX(sort_order) = 0
            ) g
          )`,
  },
  {
    table: 'checklist_trip_categories',
    sql: `UPDATE checklist_trip_categories SET sort_order = id
          WHERE trip_id IN (
            SELECT g.parent_id FROM (
              SELECT trip_id AS parent_id
              FROM checklist_trip_categories
              GROUP BY trip_id
              HAVING COUNT(*) > 1 AND MAX(sort_order) = 0
            ) g
          )`,
  },
  {
    table: 'checklist_trip_items',
    sql: `UPDATE checklist_trip_items SET sort_order = id
          WHERE checklist_trip_category_id IN (
            SELECT g.parent_id FROM (
              SELECT checklist_trip_category_id AS parent_id
              FROM checklist_trip_items
              GROUP BY checklist_trip_category_id
              HAVING COUNT(*) > 1 AND MAX(sort_order) = 0
            ) g
          )`,
  },
];

/**
 * Seeds `sort_order` on checklist categories and items that predate the
 * column, preserving their previous id-based display order. Safe to run on
 * every start-up: already ordered groups are skipped.
 */
export async function backfillChecklistOrder(): Promise<void> {
  for (const { table, sql } of BACKFILL_STATEMENTS) {
    const [result] = await pool.execute<ResultSetHeader>(sql);
    if (result.affectedRows > 0) {
      logger.info('Backfilled checklist sort_order', {
        table,
        rows: result.affectedRows,
      });
    }
  }
}
