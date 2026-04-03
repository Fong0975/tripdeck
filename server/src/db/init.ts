import pool from '../config/database';

import { tableDefinitions } from './schema';

/**
 * Ensures all tables exist, creating any that are missing.
 */
export async function initDatabase(): Promise<void> {
  for (const sql of tableDefinitions) {
    await pool.execute(sql);
  }
  console.log('[db] Tables verified.');
}
