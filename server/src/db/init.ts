import pool from '../config/database';
import { createLogger } from '../logger';

import { alignExistingTable } from './alignTable';
import { backfillChecklistOrder } from './backfillChecklistOrder';
import { migrateCheckLocations } from './checkLocationMigration';
import { getDbName, tableExists } from './introspect';
import { tableDefinitions, type TableDef } from './schema';
import { migrateSpecLocations } from './specLocationMigration';
import { buildCreateTableSql } from './sqlBuilders';

const logger = createLogger('db');

async function createTable(def: TableDef): Promise<void> {
  const sql = buildCreateTableSql(def);
  logger.debug('Running CREATE TABLE', { table: def.name, sql });
  await pool.execute(sql);
  logger.info('Created table', { table: def.name });
}

/**
 * Ensures all tables exist and match their definitions.
 *
 * Tables are processed in definition order (parents before children), so
 * foreign key targets always exist by the time they are referenced.
 *
 * - Missing tables are created with all columns, indexes and constraints.
 * - Existing tables are aligned via {@link alignExistingTable}: missing
 *   columns and indexes are added, and foreign keys are added or redefined
 *   to match (with orphan cleanup for ON DELETE CASCADE constraints).
 * - Checklist categories and items that predate `sort_order` are backfilled
 *   with their previous id order (see {@link backfillChecklistOrder}).
 * - Checklist checks are made per storage location and the legacy checks
 *   are spread over their unit's locations (see {@link migrateCheckLocations}).
 * - Items that have specs hand their storage location over to the specs
 *   (see {@link migrateSpecLocations}).
 * - Running it again against an aligned database makes no changes.
 */
export async function initDatabase(): Promise<void> {
  logger.info('Verifying tables', { tableCount: tableDefinitions.length });

  try {
    const dbName = await getDbName();

    for (const def of tableDefinitions) {
      if (await tableExists(dbName, def.name)) {
        await alignExistingTable(def, dbName);
      } else {
        await createTable(def);
      }
    }
    await backfillChecklistOrder();
    await migrateCheckLocations();
    await migrateSpecLocations();
  } catch (err) {
    logger.error('Failed to verify/initialize tables', undefined, err);
    throw err;
  }

  logger.info('Tables verified', { tableCount: tableDefinitions.length });
}
