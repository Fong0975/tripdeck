import type { RowDataPacket } from 'mysql2';

import pool from '../config/database';

import { tableDefinitions, type ColumnDef, type TableDef } from './schema';

// --- SQL builders ---

/**
 * Builds the column fragment used in both CREATE TABLE and ALTER TABLE ADD COLUMN.
 * Example: "sort_order INT NOT NULL DEFAULT 0"
 */
function buildColumnSql(col: ColumnDef): string {
  const parts: string[] = [col.name, col.type];
  if (col.notNull) {
    parts.push('NOT NULL');
  }
  if (col.default !== undefined) {
    const val =
      typeof col.default === 'string' ? `'${col.default}'` : col.default;
    parts.push(`DEFAULT ${val}`);
  }
  if (col.autoIncrement) {
    parts.push('AUTO_INCREMENT');
  }
  if (col.primaryKey) {
    parts.push('PRIMARY KEY');
  }
  return parts.join(' ');
}

/**
 * Builds the full CREATE TABLE statement for a TableDef.
 */
function buildCreateTableSql(def: TableDef): string {
  const parts: string[] = def.columns.map(buildColumnSql);

  for (const uk of def.uniqueKeys ?? []) {
    parts.push(`UNIQUE KEY ${uk.name} (${uk.columns.join(', ')})`);
  }

  for (const fk of def.foreignKeys ?? []) {
    let clause = `CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})`;
    if (fk.onDelete) {
      clause += ` ON DELETE ${fk.onDelete}`;
    }
    parts.push(clause);
  }

  return `CREATE TABLE IF NOT EXISTS ${def.name} (\n  ${parts.join(',\n  ')}\n)`;
}

// --- information_schema helpers ---

async function getDbName(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT DATABASE() AS db');
  return (rows[0] as { db: string }).db;
}

async function tableExists(
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

async function getExistingColumns(
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

// --- Per-table handlers ---

async function createTable(def: TableDef): Promise<void> {
  await pool.execute(buildCreateTableSql(def));
  console.log(`[db] Created table: ${def.name}`);
}

/**
 * Adds any columns present in the definition but absent from the live table.
 * Only the column itself is added; table-level constraints (FK, UNIQUE) are
 * not altered on existing tables.
 */
async function addMissingColumns(
  def: TableDef,
  existingColumns: Set<string>,
): Promise<void> {
  const missing = def.columns.filter(col => !existingColumns.has(col.name));

  for (const col of missing) {
    await pool.execute(
      `ALTER TABLE ${def.name} ADD COLUMN ${buildColumnSql(col)}`,
    );
    console.log(`[db] Added column "${col.name}" to table "${def.name}"`);
  }
}

// --- Entry point ---

/**
 * Ensures all tables exist and contain the expected columns.
 *
 * - Missing tables are created with all columns and constraints.
 * - Existing tables are diffed against the definition; any absent columns
 *   are appended via ALTER TABLE ADD COLUMN.
 * - Columns removed from the definition are intentionally left untouched.
 */
export async function initDatabase(): Promise<void> {
  const dbName = await getDbName();

  for (const def of tableDefinitions) {
    const exists = await tableExists(dbName, def.name);

    if (!exists) {
      await createTable(def);
    } else {
      const existingColumns = await getExistingColumns(dbName, def.name);
      await addMissingColumns(def, existingColumns);
    }
  }

  console.log('[db] Tables verified.');
}
