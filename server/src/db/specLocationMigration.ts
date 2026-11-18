import type { ResultSetHeader } from 'mysql2';

import pool from '../config/database';
import { createLogger } from '../logger';

const logger = createLogger('db');

/** A specs table and the items table it belongs to. */
interface SpecTables {
  specTable: string;
  itemTable: string;
  /** Column of `specTable` referencing `itemTable.id`. */
  parentColumn: string;
}

const SPEC_TABLES: readonly SpecTables[] = [
  {
    specTable: 'checklist_template_item_specs',
    itemTable: 'checklist_template_items',
    parentColumn: 'checklist_template_item_id',
  },
  {
    specTable: 'checklist_trip_item_specs',
    itemTable: 'checklist_trip_items',
    parentColumn: 'checklist_trip_item_id',
  },
];

/**
 * Makes the specs of one table carry their own storage locations: a spec
 * without a location copies the one of its item (the inheritance that used
 * to apply), then every item that has specs drops its own location.
 * Idempotent because an item with specs never holds a location again: the
 * API ignores one set on it and clears it when its first spec is created.
 */
async function materializeSpecLocations({
  specTable,
  itemTable,
  parentColumn,
}: SpecTables): Promise<void> {
  const [copied] = await pool.execute<ResultSetHeader>(
    `UPDATE ${specTable} s
     JOIN ${itemTable} i ON i.id = s.${parentColumn}
     SET s.storage_location = i.storage_location
     WHERE s.storage_location IS NULL
       AND i.storage_location IS NOT NULL
       AND i.storage_location <> ''`,
  );
  const [cleared] = await pool.execute<ResultSetHeader>(
    `UPDATE ${itemTable} i
     SET i.storage_location = NULL
     WHERE i.storage_location IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM ${specTable} s WHERE s.${parentColumn} = i.id
       )`,
  );
  if (copied.affectedRows > 0 || cleared.affectedRows > 0) {
    logger.info('Moved item storage locations onto their specs', {
      specTable,
      specsUpdated: copied.affectedRows,
      itemsCleared: cleared.affectedRows,
    });
  }
}

/**
 * Upgrades checklist items that have specs so the specs own the storage
 * locations (see {@link materializeSpecLocations}), for the template and the
 * trip checklists. Run after `migrateCheckLocations`, which still resolves a
 * spec's location through its item. Safe on every start-up.
 */
export async function migrateSpecLocations(): Promise<void> {
  for (const tables of SPEC_TABLES) {
    await materializeSpecLocations(tables);
  }
}
