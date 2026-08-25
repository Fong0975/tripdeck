import type { TableDef } from './types';

// --- Table definitions (ordered by foreign key dependency) ---

export const tripTables: TableDef[] = [
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
    name: 'trip_day_locations',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_day_id', type: 'INT', notNull: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_day_locations_day',
        column: 'trip_day_id',
        references: { table: 'trip_days', column: 'id' },
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
    name: 'trip_images',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'trip_id', type: 'INT', notNull: true },
      { name: 'filename', type: 'VARCHAR(255)', notNull: true },
      { name: 'title', type: 'VARCHAR(255)', notNull: true },
    ],
    foreignKeys: [
      {
        name: 'fk_trip_images_trip',
        column: 'trip_id',
        references: { table: 'trips', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },
];
