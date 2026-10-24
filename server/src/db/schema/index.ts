import { checklistTables } from './checklistTables';
import { mapsTables } from './mapsTables';
import { tripTables } from './tripTables';
import type { TableDef } from './types';

export * from './types';

export const tableDefinitions: TableDef[] = [
  ...tripTables,
  ...checklistTables,
  ...mapsTables,
];
