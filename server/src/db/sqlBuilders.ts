import type { ColumnDef, ForeignKeyDef, IndexDef, TableDef } from './schema';

/**
 * Builds the column fragment used in both CREATE TABLE and ALTER TABLE ADD COLUMN.
 * Example: "sort_order INT NOT NULL DEFAULT 0"
 *
 * @param col - Column definition.
 * @returns The column definition SQL fragment.
 */
export function buildColumnSql(col: ColumnDef): string {
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
 * Builds a secondary index clause, e.g. "KEY idx_x (a, b)".
 *
 * @param index - Index definition.
 * @returns The index clause usable in CREATE TABLE and (prefixed by ADD) ALTER TABLE.
 */
export function buildIndexClause(index: IndexDef): string {
  return `KEY ${index.name} (${index.columns.join(', ')})`;
}

/**
 * Builds a foreign key constraint clause, e.g.
 * "CONSTRAINT fk_x FOREIGN KEY (a) REFERENCES t(id) ON DELETE CASCADE".
 * ON DELETE is omitted when the definition leaves it unspecified.
 *
 * @param fk - Foreign key definition.
 * @returns The constraint clause usable in CREATE TABLE and (prefixed by ADD) ALTER TABLE.
 */
export function buildForeignKeyClause(fk: ForeignKeyDef): string {
  const clause = `CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})`;
  return fk.onDelete ? `${clause} ON DELETE ${fk.onDelete}` : clause;
}

/**
 * Builds the full CREATE TABLE statement for a TableDef.
 *
 * @param def - Table definition.
 * @returns A `CREATE TABLE IF NOT EXISTS` statement.
 */
export function buildCreateTableSql(def: TableDef): string {
  const parts: string[] = [
    ...def.columns.map(buildColumnSql),
    ...(def.uniqueKeys ?? []).map(
      uk => `UNIQUE KEY ${uk.name} (${uk.columns.join(', ')})`,
    ),
    ...(def.indexes ?? []).map(buildIndexClause),
    ...(def.foreignKeys ?? []).map(buildForeignKeyClause),
  ];

  return `CREATE TABLE IF NOT EXISTS ${def.name} (\n  ${parts.join(',\n  ')}\n)`;
}

/**
 * @param table - Table to alter.
 * @param col - Column to add.
 * @returns An `ALTER TABLE ... ADD COLUMN` statement.
 */
export function buildAddColumnSql(table: string, col: ColumnDef): string {
  return `ALTER TABLE ${table} ADD COLUMN ${buildColumnSql(col)}`;
}

/**
 * @param table - Table to alter.
 * @param index - Index to add.
 * @returns An `ALTER TABLE ... ADD INDEX` statement.
 */
export function buildAddIndexSql(table: string, index: IndexDef): string {
  return `ALTER TABLE ${table} ADD INDEX ${index.name} (${index.columns.join(', ')})`;
}

/**
 * @param table - Table to alter.
 * @param name - Name of the unique key to add.
 * @param columns - Columns of the unique key, in order.
 * @returns An `ALTER TABLE ... ADD UNIQUE KEY` statement.
 */
export function buildAddUniqueKeySql(
  table: string,
  name: string,
  columns: readonly string[],
): string {
  return `ALTER TABLE ${table} ADD UNIQUE KEY ${name} (${columns.join(', ')})`;
}

/**
 * @param table - Table to alter.
 * @param name - Name of the index (or unique key) to drop.
 * @returns An `ALTER TABLE ... DROP INDEX` statement.
 */
export function buildDropIndexSql(table: string, name: string): string {
  return `ALTER TABLE ${table} DROP INDEX ${name}`;
}

/**
 * @param table - Table to alter.
 * @param fk - Foreign key to add.
 * @returns An `ALTER TABLE ... ADD CONSTRAINT` statement.
 */
export function buildAddForeignKeySql(
  table: string,
  fk: ForeignKeyDef,
): string {
  return `ALTER TABLE ${table} ADD ${buildForeignKeyClause(fk)}`;
}

/**
 * @param table - Table to alter.
 * @param fkName - Name of the foreign key constraint to drop.
 * @returns An `ALTER TABLE ... DROP FOREIGN KEY` statement.
 */
export function buildDropForeignKeySql(table: string, fkName: string): string {
  return `ALTER TABLE ${table} DROP FOREIGN KEY ${fkName}`;
}

/**
 * Builds a DELETE that removes child rows whose foreign key column points at a
 * parent row that no longer exists (NULL references are kept). Uses the
 * multi-table LEFT JOIN form because MySQL rejects a NOT IN subquery on the
 * same table being deleted from (self-referencing FKs).
 *
 * @param table - Child table.
 * @param fk - Foreign key whose orphans should be removed.
 * @returns A DELETE statement.
 */
export function buildDeleteOrphansSql(
  table: string,
  fk: ForeignKeyDef,
): string {
  const { table: parentTable, column: parentColumn } = fk.references;
  return (
    `DELETE c FROM ${table} c ` +
    `LEFT JOIN ${parentTable} p ON c.${fk.column} = p.${parentColumn} ` +
    `WHERE c.${fk.column} IS NOT NULL AND p.${parentColumn} IS NULL`
  );
}
