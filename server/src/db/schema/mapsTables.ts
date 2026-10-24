import type { TableDef } from './types';

export const mapsTables: TableDef[] = [
  {
    name: 'maps_usage',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'day', type: 'DATE', notNull: true },
      { name: 'kind', type: 'VARCHAR(16)', notNull: true },
      { name: 'count', type: 'INT', notNull: true, default: 0 },
      { name: 'exhausted', type: 'TINYINT(1)', notNull: true, default: 0 },
    ],
    uniqueKeys: [{ name: 'uq_maps_usage_day_kind', columns: ['day', 'kind'] }],
  },
];
