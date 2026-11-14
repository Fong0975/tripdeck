export interface ColumnDef {
  name: string;
  type: string;
  notNull?: boolean;
  /** Raw SQL default value. Numbers are emitted as-is; strings are quoted. */
  default?: number | string;
  autoIncrement?: boolean;
  primaryKey?: boolean;
}

export interface UniqueKeyDef {
  name: string;
  columns: string[];
}

/** A non-unique secondary index (emitted as `KEY name (cols)`). */
export interface IndexDef {
  name: string;
  columns: string[];
}

export type ForeignKeyDeleteRule =
  'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface ForeignKeyDef {
  name: string;
  column: string;
  references: { table: string; column: string };
  /** Omitted means the MySQL default (RESTRICT / NO ACTION). */
  onDelete?: ForeignKeyDeleteRule;
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  uniqueKeys?: UniqueKeyDef[];
  indexes?: IndexDef[];
  foreignKeys?: ForeignKeyDef[];
}
