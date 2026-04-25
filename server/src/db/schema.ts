// --- Type definitions ---

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

// --- Table definitions (ordered by foreign key dependency) ---

export const tableDefinitions: TableDef[] = [
  {
    name: 'trips',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'title', type: 'VARCHAR(255)', notNull: true },
      { name: 'destination', type: 'VARCHAR(255)' },
      { name: 'start_date', type: 'DATE', notNull: true },
      { name: 'end_date', type: 'DATE', notNull: true },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notNull: true },
    ],
  },

  {
    name: 'trip_days',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_id', type: 'INT', notNull: true },
      { name: 'day', type: 'INT', notNull: true },
      { name: 'date', type: 'DATE', notNull: true },
    ],
    uniqueKeys: [{ name: 'uq_trip_day', columns: ['trip_id', 'day'] }],
    foreignKeys: [
      {
        name: 'fk_trip_days_trip',
        column: 'trip_id',
        references: { table: 'trips', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'trip_attractions',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_day_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'google_map_url', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'nearby_attractions', type: 'TEXT' },
      { name: 'start_time', type: 'VARCHAR(10)' },
      { name: 'end_time', type: 'VARCHAR(10)' },
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_attractions_day',
        column: 'trip_day_id',
        references: { table: 'trip_days', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'trip_attraction_websites',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_attraction_id', type: 'INT', notNull: true },
      { name: 'url', type: 'TEXT', notNull: true },
      { name: 'title', type: 'VARCHAR(255)', notNull: true, default: '' },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_attraction_websites_attraction',
        column: 'trip_attraction_id',
        references: { table: 'trip_attractions', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'trip_connections',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_day_id', type: 'INT', notNull: true },
      { name: 'trip_attraction_id_from', type: 'INT', notNull: true },
      { name: 'trip_attraction_id_to', type: 'INT', notNull: true },
      { name: 'transport_mode', type: 'VARCHAR(50)' },
      { name: 'duration', type: 'VARCHAR(100)' },
      { name: 'route', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_connections_day',
        column: 'trip_day_id',
        references: { table: 'trip_days', column: 'id' },
        onDelete: 'CASCADE',
      },
      {
        name: 'fk_trip_connections_from',
        column: 'trip_attraction_id_from',
        references: { table: 'trip_attractions', column: 'id' },
      },
      {
        name: 'fk_trip_connections_to',
        column: 'trip_attraction_id_to',
        references: { table: 'trip_attractions', column: 'id' },
      },
    ],
  },

  {
    name: 'trip_attraction_images',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_attraction_id', type: 'INT', notNull: true },
      { name: 'filename', type: 'VARCHAR(255)', notNull: true },
      { name: 'title', type: 'VARCHAR(255)', notNull: true },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_attraction_images_attraction',
        column: 'trip_attraction_id',
        references: { table: 'trip_attractions', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'trip_connection_images',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_connection_id', type: 'INT', notNull: true },
      { name: 'filename', type: 'VARCHAR(255)', notNull: true },
      { name: 'title', type: 'VARCHAR(255)', notNull: true },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_connection_images_connection',
        column: 'trip_connection_id',
        references: { table: 'trip_connections', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_template_categories',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
    ],
  },

  {
    name: 'checklist_template_items',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_template_category_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'quantity', type: 'INT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'storage_location', type: 'VARCHAR(255)' },
    ],
    foreignKeys: [
      {
        name: 'fk_template_items_category',
        column: 'checklist_template_category_id',
        references: { table: 'checklist_template_categories', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_template_item_specs',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_template_item_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'storage_location', type: 'VARCHAR(255)' },
    ],
    foreignKeys: [
      {
        name: 'fk_template_item_specs_item',
        column: 'checklist_template_item_id',
        references: { table: 'checklist_template_items', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_trip_categories',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
    ],
    foreignKeys: [
      {
        name: 'fk_checklist_trip_categories_trip',
        column: 'trip_id',
        references: { table: 'trips', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_trip_items',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_trip_category_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'quantity', type: 'INT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'storage_location', type: 'VARCHAR(255)' },
    ],
    foreignKeys: [
      {
        name: 'fk_checklist_trip_items_category',
        column: 'checklist_trip_category_id',
        references: { table: 'checklist_trip_categories', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_trip_item_specs',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_trip_item_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'storage_location', type: 'VARCHAR(255)' },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_item_specs_item',
        column: 'checklist_trip_item_id',
        references: { table: 'checklist_trip_items', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_occasions',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
    ],
    foreignKeys: [
      {
        name: 'fk_checklist_occasions_trip',
        column: 'trip_id',
        references: { table: 'trips', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },

  {
    name: 'checklist_checks',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_occasion_id', type: 'INT', notNull: true },
      { name: 'checklist_trip_item_id', type: 'INT', notNull: true },
      { name: 'checked', type: 'TINYINT(1)', notNull: true, default: 0 },
    ],
    uniqueKeys: [
      {
        name: 'uq_occasion_item',
        columns: ['checklist_occasion_id', 'checklist_trip_item_id'],
      },
    ],
    foreignKeys: [
      {
        name: 'fk_checklist_checks_occasion',
        column: 'checklist_occasion_id',
        references: { table: 'checklist_occasions', column: 'id' },
        onDelete: 'CASCADE',
      },
      {
        name: 'fk_checklist_checks_item',
        column: 'checklist_trip_item_id',
        references: { table: 'checklist_trip_items', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },
];
