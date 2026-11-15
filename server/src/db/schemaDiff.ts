import type { ColumnDef, ForeignKeyDef, IndexDef, TableDef } from './schema';

/** A foreign key as currently present in the live database. */
export interface ExistingForeignKey {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  /** DELETE_RULE as reported by information_schema (e.g. "CASCADE", "NO ACTION"). */
  deleteRule: string;
}

/** A planned change bringing one defined foreign key in line with the definition. */
export interface ForeignKeyChange {
  fk: ForeignKeyDef;
  /** Whether a constraint with this name exists and must be dropped first. */
  dropExisting: boolean;
  /**
   * Whether orphaned child rows should be deleted before adding the
   * constraint. Only true for ON DELETE CASCADE, where those rows would have
   * been removed by the database anyway.
   */
  removeOrphans: boolean;
}

/**
 * Collapses equivalent delete rules: InnoDB treats RESTRICT and NO ACTION the
 * same, and MySQL reports either one for a constraint declared without ON
 * DELETE, so both (and "unspecified") compare equal.
 *
 * @param rule - A defined or introspected delete rule; undefined means unspecified.
 * @returns The canonical rule.
 */
export function normalizeDeleteRule(rule: string | undefined): string {
  const upper = (rule ?? 'RESTRICT').toUpperCase();
  return upper === 'NO ACTION' ? 'RESTRICT' : upper;
}

/**
 * @param def - Table definition.
 * @param existingColumns - Column names present in the live table.
 * @returns Defined columns absent from the live table, in definition order.
 */
export function findMissingColumns(
  def: TableDef,
  existingColumns: ReadonlySet<string>,
): ColumnDef[] {
  return def.columns.filter(col => !existingColumns.has(col.name));
}

/**
 * Indexes are matched by name only; a same-named index with different
 * columns is left alone.
 *
 * @param def - Table definition.
 * @param existingIndexNames - Index names present in the live table.
 * @returns Defined indexes absent from the live table, in definition order.
 */
export function findMissingIndexes(
  def: TableDef,
  existingIndexNames: ReadonlySet<string>,
): IndexDef[] {
  return (def.indexes ?? []).filter(idx => !existingIndexNames.has(idx.name));
}

function foreignKeyMatches(
  fk: ForeignKeyDef,
  existing: ExistingForeignKey,
): boolean {
  return (
    existing.column === fk.column &&
    existing.referencedTable === fk.references.table &&
    existing.referencedColumn === fk.references.column &&
    normalizeDeleteRule(existing.deleteRule) ===
      normalizeDeleteRule(fk.onDelete)
  );
}

/**
 * Plans the foreign key changes needed for a table: defined constraints that
 * are missing get added; those whose column, target or delete rule differ are
 * dropped and re-added. Live constraints absent from the definition are
 * intentionally left untouched.
 *
 * @param def - Table definition.
 * @param existing - Live foreign keys keyed by constraint name.
 * @returns The changes to apply, in definition order.
 */
export function planForeignKeyChanges(
  def: TableDef,
  existing: ReadonlyMap<string, ExistingForeignKey>,
): ForeignKeyChange[] {
  const changes: ForeignKeyChange[] = [];

  for (const fk of def.foreignKeys ?? []) {
    const current = existing.get(fk.name);
    if (current && foreignKeyMatches(fk, current)) {
      continue;
    }
    changes.push({
      fk,
      dropExisting: current !== undefined,
      removeOrphans: fk.onDelete === 'CASCADE',
    });
  }

  return changes;
}
