import type { RowDataPacket } from 'mysql2';

import pool from '../config/database';

import type { ExistingForeignKey } from './schemaDiff';

/**
 * @returns The name of the database the pool is connected to.
 */
export async function getDbName(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() AS db');
  return (rows[0] as { db: string }).db;
}

/**
 * @param dbName - Schema name.
 * @param tableName - Table name.
 * @returns Whether the table exists.
 */
export async function tableExists(
  dbName: string,
  tableName: string,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, tableName],
  );
  return rows.length > 0;
}

/**
 * @param dbName - Schema name.
 * @param tableName - Table name.
 * @returns Names of the columns present in the live table.
 */
export async function getExistingColumns(
  dbName: string,
  tableName: string,
): Promise<Set<string>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, tableName],
  );
  return new Set(rows.map(r => (r as { COLUMN_NAME: string }).COLUMN_NAME));
}

/**
 * @param dbName - Schema name.
 * @param tableName - Table name.
 * @returns Names of all indexes (including PRIMARY, UNIQUE and FK-backing ones) on the live table.
 */
export async function getExistingIndexNames(
  dbName: string,
  tableName: string,
): Promise<Set<string>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT INDEX_NAME AS indexName
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, tableName],
  );
  return new Set(rows.map(r => (r as { indexName: string }).indexName));
}

/**
 * Reads the live foreign keys of a table, combining the delete rule from
 * REFERENTIAL_CONSTRAINTS with the column mapping from KEY_COLUMN_USAGE.
 * All defined FKs are single-column, so one row per constraint is expected.
 *
 * @param dbName - Schema name.
 * @param tableName - Table name.
 * @returns Live foreign keys keyed by constraint name.
 */
export async function getExistingForeignKeys(
  dbName: string,
  tableName: string,
): Promise<Map<string, ExistingForeignKey>> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rc.CONSTRAINT_NAME AS name,
            rc.DELETE_RULE AS deleteRule,
            kcu.COLUMN_NAME AS columnName,
            kcu.REFERENCED_TABLE_NAME AS referencedTable,
            kcu.REFERENCED_COLUMN_NAME AS referencedColumn
     FROM information_schema.REFERENTIAL_CONSTRAINTS rc
     JOIN information_schema.KEY_COLUMN_USAGE kcu
       ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
      AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      AND kcu.TABLE_NAME = rc.TABLE_NAME
     WHERE rc.CONSTRAINT_SCHEMA = ? AND rc.TABLE_NAME = ?`,
    [dbName, tableName],
  );

  const result = new Map<string, ExistingForeignKey>();
  for (const row of rows) {
    const r = row as {
      name: string;
      deleteRule: string;
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
    };
    result.set(r.name, {
      name: r.name,
      column: r.columnName,
      referencedTable: r.referencedTable,
      referencedColumn: r.referencedColumn,
      deleteRule: r.deleteRule,
    });
  }
  return result;
}
