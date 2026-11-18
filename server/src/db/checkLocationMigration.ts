import { STORAGE_OPTIONS } from '@tripdeck/shared';
import type { ResultSetHeader } from 'mysql2';

import pool from '../config/database';
import { createLogger } from '../logger';

import { getDbName, getExistingIndexNames } from './introspect';
import { buildAddUniqueKeySql, buildDropIndexSql } from './sqlBuilders';

const logger = createLogger('db');

/** A check table whose unique key gained the `location` column. */
interface CheckTableConfig {
  table: string;
  /** Column referencing the checked item or spec. */
  idColumn: string;
  oldUniqueKey: string;
  newUniqueKey: string;
  /**
   * FROM-clause joins that make the owning item (`i`) and, when the checks
   * belong to specs, the spec (`s`) reachable from the check row (`c`).
   */
  joins: string;
  /** SQL expression resolving the raw storage location of a check's unit. */
  locationExpr: string;
}

const CHECK_TABLES: readonly CheckTableConfig[] = [
  {
    table: 'checklist_checks',
    idColumn: 'checklist_trip_item_id',
    oldUniqueKey: 'uq_occasion_item',
    newUniqueKey: 'uq_occasion_item_location',
    joins: 'JOIN checklist_trip_items i ON i.id = c.checklist_trip_item_id',
    locationExpr: 'i.storage_location',
  },
  {
    table: 'checklist_spec_checks',
    idColumn: 'checklist_trip_item_spec_id',
    oldUniqueKey: 'uq_occasion_spec',
    newUniqueKey: 'uq_occasion_spec_location',
    joins: `JOIN checklist_trip_item_specs s ON s.id = c.checklist_trip_item_spec_id
            JOIN checklist_trip_items i ON i.id = s.checklist_trip_item_id`,
    locationExpr: 'COALESCE(s.storage_location, i.storage_location)',
  },
];

/**
 * Replaces the pre-`location` unique key of a check table with the one that
 * includes it. The new key is added first so the occasion foreign key always
 * keeps a usable index. Skipped when the new key already exists.
 */
async function replaceUniqueKey(config: CheckTableConfig): Promise<void> {
  const { table, idColumn, oldUniqueKey, newUniqueKey } = config;
  const existing = await getExistingIndexNames(await getDbName(), table);

  if (!existing.has(newUniqueKey)) {
    await pool.execute(
      buildAddUniqueKeySql(table, newUniqueKey, [
        'checklist_occasion_id',
        idColumn,
        'location',
      ]),
    );
    logger.info('Added unique key', { table, key: newUniqueKey });
  }
  if (existing.has(oldUniqueKey)) {
    await pool.execute(buildDropIndexSql(table, oldUniqueKey));
    logger.info('Dropped unique key', { table, key: oldUniqueKey });
  }
}

/** SQL fragment matching a raw location that contains `?` as a list entry. */
function containsOption(locationExpr: string): string {
  return `FIND_IN_SET(?, REPLACE(${locationExpr}, ' ', '')) > 0`;
}

/**
 * Spreads the checks stored before the `location` column existed (all
 * `location = ''`) over every storage option their unit is filed under, then
 * removes the legacy rows. Units without any known option keep their `''`
 * check. Idempotent: afterwards no `''` row belongs to a unit that has an
 * option, because the API only writes locations the unit actually has.
 */
async function spreadLegacyChecks(config: CheckTableConfig): Promise<void> {
  const { table, idColumn, joins, locationExpr } = config;

  let inserted = 0;
  for (const option of STORAGE_OPTIONS) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO ${table} (checklist_occasion_id, ${idColumn}, location, checked)
       SELECT c.checklist_occasion_id, c.${idColumn}, ?, c.checked
       FROM ${table} c ${joins}
       WHERE c.location = '' AND ${containsOption(locationExpr)}`,
      [option, option],
    );
    inserted += result.affectedRows;
  }

  const hasAnyOption = STORAGE_OPTIONS.map(() =>
    containsOption(locationExpr),
  ).join(' OR ');
  const [deleted] = await pool.execute<ResultSetHeader>(
    `DELETE c FROM ${table} c ${joins}
     WHERE c.location = '' AND (${hasAnyOption})`,
    [...STORAGE_OPTIONS],
  );

  if (inserted > 0 || deleted.affectedRows > 0) {
    logger.info('Spread legacy checks over storage locations', {
      table,
      inserted,
      removedLegacyRows: deleted.affectedRows,
    });
  }
}

/**
 * Upgrades the checklist check tables to per-location checks: swaps their
 * unique keys for ones that include `location` and spreads pre-existing
 * checks over the storage locations of their item or spec. Run after the
 * tables were aligned (so the `location` column exists); safe on every
 * start-up.
 */
export async function migrateCheckLocations(): Promise<void> {
  for (const config of CHECK_TABLES) {
    await replaceUniqueKey(config);
    await spreadLegacyChecks(config);
  }
}
