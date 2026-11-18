import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { placeholders } from '../../../utils/sql';
import { withTransaction } from '../../../utils/withTransaction';
import { isPermutationOf } from '../../shared/orderedIds';

/** Checklist tables whose rows carry a `sort_order` among their siblings. */
export type OrderedChecklistTable =
  | 'checklist_location_labels'
  | 'checklist_template_categories'
  | 'checklist_template_items'
  | 'checklist_trip_categories'
  | 'checklist_trip_items';

/**
 * Column grouping the siblings of each table, or null when all rows of the
 * table are siblings (the global template category and location label lists). Only these
 * fixed values are ever interpolated into SQL.
 */
const SIBLING_COLUMN: Record<OrderedChecklistTable, string | null> = {
  checklist_location_labels: null,
  checklist_template_categories: null,
  checklist_template_items: 'checklist_template_category_id',
  checklist_trip_categories: 'trip_id',
  checklist_trip_items: 'checklist_trip_category_id',
};

/** Outcome of {@link reorderSiblings}. */
export type ReorderResult = 'reordered' | 'invalid_order';

interface IdRow extends RowDataPacket {
  id: number;
}

/**
 * Returns the ids of a sibling group in display order, locking the rows.
 *
 * @param conn - Connection with an open transaction.
 * @param table - Ordered checklist table.
 * @param parentId - Value of the table's sibling column; ignored for tables
 *   without one.
 */
async function lockSiblingOrder(
  conn: PoolConnection,
  table: OrderedChecklistTable,
  parentId: number | null,
): Promise<number[]> {
  const column = SIBLING_COLUMN[table];
  const where = column ? `WHERE ${column} = ?` : '';
  const [rows] = await conn.execute<IdRow[]>(
    `SELECT id FROM ${table} ${where} ORDER BY sort_order, id FOR UPDATE`,
    column ? [parentId] : [],
  );
  return rows.map(row => row.id);
}

/**
 * Writes sort_order 0..n-1 for the given ids in a single `UPDATE ... CASE`.
 *
 * @param conn - Connection with an open transaction.
 * @param table - Ordered checklist table.
 * @param orderedIds - Row ids in their final order.
 */
async function writeSortOrder(
  conn: PoolConnection,
  table: OrderedChecklistTable,
  orderedIds: readonly number[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  const cases = orderedIds.map(() => 'WHEN ? THEN ?').join(' ');
  const caseParams = orderedIds.flatMap((id, i) => [id, i]);
  await conn.execute(
    `UPDATE ${table} SET sort_order = CASE id ${cases} END WHERE id IN (${placeholders(orderedIds.length)})`,
    [...caseParams, ...orderedIds],
  );
}

/**
 * Returns the sort_order a row appended to a sibling group should get.
 * MAX + 1 (rather than COUNT) stays collision-free after a row is deleted
 * from the middle of the group.
 *
 * @param conn - Connection with an open transaction.
 * @param table - Ordered checklist table.
 * @param parentId - Value of the table's sibling column; ignored for tables
 *   without one.
 * @returns One past the group's highest sort_order, or 0 for an empty group.
 */
export async function nextSiblingOrder(
  conn: PoolConnection,
  table: OrderedChecklistTable,
  parentId: number | null,
): Promise<number> {
  const column = SIBLING_COLUMN[table];
  const where = column ? `WHERE ${column} = ?` : '';
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM ${table} ${where}`,
    column ? [parentId] : [],
  );
  return Number(rows[0]?.next_order ?? 0);
}

/**
 * Renumbers a sibling group according to `orderedIds`, atomically.
 *
 * `orderedIds` must list each sibling exactly once (checked inside the
 * transaction against the locked rows); otherwise nothing changes and
 * `invalid_order` is returned, so a stale or partial list can never leave
 * siblings with outdated orders.
 *
 * @param table - Ordered checklist table.
 * @param parentId - Value of the table's sibling column (trip id or category
 *   id); pass null for the template category list.
 * @param orderedIds - Every sibling id, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not a
 *   permutation of the group's ids.
 */
export function reorderSiblings(
  table: OrderedChecklistTable,
  parentId: number | null,
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return withTransaction<ReorderResult>(async conn => {
    const currentIds = await lockSiblingOrder(conn, table, parentId);
    if (!isPermutationOf(orderedIds, currentIds)) {
      return 'invalid_order';
    }
    await writeSortOrder(conn, table, orderedIds);
    return 'reordered';
  });
}
