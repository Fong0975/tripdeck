import { checklistTables } from './checklistTables';
import { tripTables } from './tripTables';
import type { TableDef } from './types';

export * from './types';

export const tableDefinitions: TableDef[] = [...tripTables, ...checklistTables];
