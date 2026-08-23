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

export interface ForeignKeyDef {
  name: string;
  column: string;
  references: { table: string; column: string };
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  uniqueKeys?: UniqueKeyDef[];
  foreignKeys?: ForeignKeyDef[];
}
