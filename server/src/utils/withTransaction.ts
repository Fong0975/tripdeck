import type { PoolConnection } from 'mysql2/promise';

import pool from '../config/database';

/**
 * Runs `work` inside a single database transaction on a dedicated pooled
 * connection. Commits when `work` resolves, rolls back when it rejects, and
 * always releases the connection.
 *
 * @param work - Callback receiving the transaction's connection; every query
 *   that must be atomic has to go through this connection.
 * @returns Whatever `work` resolves to.
 * @throws Re-throws the error from `work` (or from commit) after rolling back.
 */
export async function withTransaction<T>(
  work: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
