import type { TableDef } from './types';

// --- Table definitions (ordered by foreign key dependency) ---

export const LOCATION_LABEL_TABLE = 'checklist_location_labels';

export const checklistTables: TableDef[] = [
  {
    name: LOCATION_LABEL_TABLE,
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'name', type: 'VARCHAR(64)', notNull: true },
      { name: 'show_as_group', type: 'TINYINT(1)', notNull: true, default: 1 },
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    uniqueKeys: [
      { name: 'uq_checklist_location_labels_name', columns: ['name'] },
    ],
  },

  {
    name: 'checklist_template_categories',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    indexes: [
      {
        name: 'idx_checklist_template_categories_order',
        columns: ['sort_order'],
      },
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
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    indexes: [
      {
        name: 'idx_checklist_template_items_category_order',
        columns: ['checklist_template_category_id', 'sort_order'],
      },
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
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    indexes: [
      {
        name: 'idx_checklist_trip_categories_trip_order',
        columns: ['trip_id', 'sort_order'],
      },
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
      { name: 'sort_order', type: 'INT', notNull: true, default: 0 },
    ],
    indexes: [
      {
        name: 'idx_checklist_trip_items_category_order',
        columns: ['checklist_trip_category_id', 'sort_order'],
      },
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
      { name: 'location', type: 'VARCHAR(255)', notNull: true, default: '' },
      { name: 'checked', type: 'TINYINT(1)', notNull: true, default: 0 },
    ],
    uniqueKeys: [
      {
        name: 'uq_occasion_item_location',
        columns: [
          'checklist_occasion_id',
          'checklist_trip_item_id',
          'location',
        ],
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

  {
    name: 'checklist_spec_checks',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'checklist_occasion_id', type: 'INT', notNull: true },
      { name: 'checklist_trip_item_spec_id', type: 'INT', notNull: true },
      { name: 'location', type: 'VARCHAR(255)', notNull: true, default: '' },
      { name: 'checked', type: 'TINYINT(1)', notNull: true, default: 0 },
    ],
    uniqueKeys: [
      {
        name: 'uq_occasion_spec_location',
        columns: [
          'checklist_occasion_id',
          'checklist_trip_item_spec_id',
          'location',
        ],
      },
    ],
    foreignKeys: [
      {
        name: 'fk_checklist_spec_checks_occasion',
        column: 'checklist_occasion_id',
        references: { table: 'checklist_occasions', column: 'id' },
        onDelete: 'CASCADE',
      },
      {
        name: 'fk_checklist_spec_checks_spec',
        column: 'checklist_trip_item_spec_id',
        references: { table: 'checklist_trip_item_specs', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  },
];
