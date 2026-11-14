import type { PoolConnection } from 'mysql2/promise';

/**
 * Maximum rows sent in one multi-row INSERT, keeping each statement well
 * below MySQL's `max_allowed_packet` even for wide text rows.
 */
export const BULK_INSERT_CHUNK_SIZE = 500;

/**
 * Inserts `rows` into `table` with as few multi-row
 * `INSERT ... VALUES (...), (...)` statements as possible (one per
 * {@link BULK_INSERT_CHUNK_SIZE} rows), instead of one round trip per row.
 *
 * Uses `query` rather than `execute`: only the text protocol expands the
 * nested-array `VALUES ?` form. Values are still escaped by mysql2.
 *
 * Intended for leaf rows whose generated IDs nobody needs; callers that must
 * map parent rows to their new IDs should keep inserting those one by one.
 *
 * @param conn - Connection to run on (typically inside a transaction).
 * @param table - Target table; must be a trusted constant, never user input.
 * @param columns - Target columns; must be trusted constants.
 * @param rows - One value array per row, in `columns` order. Empty is a no-op.
 */
export async function bulkInsert(
  conn: Pick<PoolConnection, 'query'>,
  table: string,
  columns: readonly string[],
  rows: ReadonlyArray<readonly unknown[]>,
): Promise<void> {
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ?`;
  for (let start = 0; start < rows.length; start += BULK_INSERT_CHUNK_SIZE) {
    await conn.query(sql, [rows.slice(start, start + BULK_INSERT_CHUNK_SIZE)]);
  }
}
