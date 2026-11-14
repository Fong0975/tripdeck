import type { ResultSetHeader } from 'mysql2';

import pool from '../config/database';
import { createLogger } from '../logger';

import {
  getExistingColumns,
  getExistingForeignKeys,
  getExistingIndexNames,
} from './introspect';
import type { TableDef } from './schema';
import {
  findMissingColumns,
  findMissingIndexes,
  planForeignKeyChanges,
  type ForeignKeyChange,
} from './schemaDiff';
import {
  buildAddColumnSql,
  buildAddForeignKeySql,
  buildAddIndexSql,
  buildDeleteOrphansSql,
  buildDropForeignKeySql,
} from './sqlBuilders';

const logger = createLogger('db');

async function runAlter(
  sql: string,
  table: string,
  detail: Record<string, unknown>,
): Promise<void> {
  logger.debug('Running ALTER TABLE', { table, ...detail, sql });
  await pool.execute(sql);
}

async function addMissingColumns(def: TableDef, dbName: string): Promise<void> {
  const existing = await getExistingColumns(dbName, def.name);
  for (const col of findMissingColumns(def, existing)) {
    await runAlter(buildAddColumnSql(def.name, col), def.name, {
      column: col.name,
    });
    logger.info('Added column', { table: def.name, column: col.name });
  }
}

async function addMissingIndexes(def: TableDef, dbName: string): Promise<void> {
  if (!def.indexes?.length) {
    return;
  }
  const existing = await getExistingIndexNames(dbName, def.name);
  for (const index of findMissingIndexes(def, existing)) {
    await runAlter(buildAddIndexSql(def.name, index), def.name, {
      index: index.name,
    });
    logger.info('Added index', {
      table: def.name,
      index: index.name,
      columns: index.columns,
    });
  }
}

async function removeOrphans(
  table: string,
  change: ForeignKeyChange,
): Promise<void> {
  const sql = buildDeleteOrphansSql(table, change.fk);
  logger.debug('Deleting orphan rows', {
    table,
    constraint: change.fk.name,
    sql,
  });
  const [result] = await pool.execute<ResultSetHeader>(sql);
  if (result.affectedRows > 0) {
    logger.warn('Deleted orphan rows before adding foreign key', {
      table,
      constraint: change.fk.name,
      column: change.fk.column,
      referencedTable: change.fk.references.table,
      deletedRows: result.affectedRows,
    });
  }
}

async function applyForeignKeyChange(
  table: string,
  change: ForeignKeyChange,
): Promise<void> {
  const { fk } = change;

  if (change.removeOrphans) {
    await removeOrphans(table, change);
  }

  if (change.dropExisting) {
    await runAlter(buildDropForeignKeySql(table, fk.name), table, {
      constraint: fk.name,
    });
    logger.info('Dropped foreign key for redefinition', {
      table,
      constraint: fk.name,
    });
  }

  try {
    await runAlter(buildAddForeignKeySql(table, fk), table, {
      constraint: fk.name,
    });
  } catch (err) {
    logger.error(
      'Failed to add foreign key; existing rows may reference missing parents and must be fixed manually',
      {
        table,
        constraint: fk.name,
        column: fk.column,
        referencedTable: fk.references.table,
        onDelete: fk.onDelete ?? 'RESTRICT',
      },
      err,
    );
    throw err;
  }
  logger.info('Added foreign key', {
    table,
    constraint: fk.name,
    onDelete: fk.onDelete ?? 'RESTRICT',
  });
}

async function alignForeignKeys(def: TableDef, dbName: string): Promise<void> {
  if (!def.foreignKeys?.length) {
    return;
  }
  const existing = await getExistingForeignKeys(dbName, def.name);
  for (const change of planForeignKeyChanges(def, existing)) {
    await applyForeignKeyChange(def.name, change);
  }
}

/**
 * Brings an existing table in line with its definition, idempotently:
 *
 * 1. Adds missing columns (removed columns are left untouched).
 * 2. Adds missing secondary indexes, matched by name.
 * 3. Adds missing foreign keys and drops/re-adds ones whose column, target
 *    or delete rule differ. For ON DELETE CASCADE constraints, orphaned child
 *    rows are deleted first (they would have been cascaded away anyway);
 *    for other rules an orphan makes the ALTER fail, which is logged and
 *    rethrown.
 *
 * Unique keys and constraints absent from the definition are not touched.
 *
 * @param def - Table definition.
 * @param dbName - Schema name of the live database.
 */
export async function alignExistingTable(
  def: TableDef,
  dbName: string,
): Promise<void> {
  await addMissingColumns(def, dbName);
  await addMissingIndexes(def, dbName);
  await alignForeignKeys(def, dbName);
}
