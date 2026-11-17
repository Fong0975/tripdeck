import type {
  ChecklistCategory,
  ChecklistOccasion,
  TripChecklist,
} from '@tripdeck/shared';
import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../logger';
import { bulkInsert } from '../../utils/bulkInsert';

import { consistencyError } from './tripImportHelpers';

const logger = createLogger('backup');

/** Old (backup) checklist item and spec IDs mapped to their new IDs. */
interface ChecklistIdMaps {
  itemIdMap: Map<number, number>;
  specIdMap: Map<number, number>;
}

/**
 * Inserts the checklist categories, items and specs under `newTripId`.
 * Every row goes in one at a time because the new item and spec IDs are
 * needed to remap the occasions' checks.
 *
 * @returns Old (backup) item and spec IDs -> newly-inserted IDs.
 */
async function insertCategories(
  conn: PoolConnection,
  newTripId: number,
  categories: ChecklistCategory[],
): Promise<ChecklistIdMaps> {
  const itemIdMap = new Map<number, number>();
  const specIdMap = new Map<number, number>();
  for (const [categoryIndex, category] of categories.entries()) {
    const [categoryResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)',
      [newTripId, category.name, categoryIndex],
    );
    const newCategoryId = categoryResult.insertId;

    for (const [itemIndex, item] of category.items.entries()) {
      const [itemResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [
          newCategoryId,
          item.name,
          item.quantity,
          item.notes,
          item.storage_location,
          itemIndex,
        ],
      );
      const newItemId = itemResult.insertId;
      itemIdMap.set(item.id, newItemId);

      for (const spec of item.specs) {
        const [specResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
          [newItemId, spec.name, spec.storage_location],
        );
        specIdMap.set(spec.id, specResult.insertId);
      }
    }
  }
  return { itemIdMap, specIdMap };
}

/**
 * Inserts the checklist occasions and their checked items and specs,
 * remapping IDs through `itemIdMap` and `specIdMap`. Unchecked entries are
 * skipped. Occasions go in one row at a time (their new IDs are needed); the
 * leaf check rows are sent as one multi-row insert per table at the end.
 *
 * @throws {TripImportDataError} When a check references an item or spec that
 *   was not imported.
 */
async function insertOccasions(
  conn: PoolConnection,
  originalTripId: number,
  newTripId: number,
  occasions: ChecklistOccasion[],
  { itemIdMap, specIdMap }: ChecklistIdMaps,
): Promise<void> {
  const checkRows: unknown[][] = [];
  const specCheckRows: unknown[][] = [];
  for (const occasion of occasions) {
    const [occasionResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
      [newTripId, occasion.name],
    );
    const newOccasionId = occasionResult.insertId;

    for (const [itemIdStr, checked] of Object.entries(occasion.checks)) {
      if (!checked) {
        continue;
      }
      const newItemId = itemIdMap.get(Number(itemIdStr));
      if (newItemId === undefined) {
        throw consistencyError(
          originalTripId,
          `Occasion ${occasion.id} references checklist item ${itemIdStr} that was not imported`,
        );
      }
      checkRows.push([newOccasionId, newItemId, 1]);
    }

    // Backups made before spec checks existed omit the field.
    for (const [specIdStr, checked] of Object.entries(
      occasion.specChecks ?? {},
    )) {
      if (!checked) {
        continue;
      }
      const newSpecId = specIdMap.get(Number(specIdStr));
      if (newSpecId === undefined) {
        throw consistencyError(
          originalTripId,
          `Occasion ${occasion.id} references checklist spec ${specIdStr} that was not imported`,
        );
      }
      specCheckRows.push([newOccasionId, newSpecId, 1]);
    }
  }
  await bulkInsert(
    conn,
    'checklist_checks',
    ['checklist_occasion_id', 'checklist_trip_item_id', 'checked'],
    checkRows,
  );
  await bulkInsert(
    conn,
    'checklist_spec_checks',
    ['checklist_occasion_id', 'checklist_trip_item_spec_id', 'checked'],
    specCheckRows,
  );
}

/**
 * Inserts a trip's full checklist subtree (categories, items, specs,
 * occasions and checks) under `newTripId`, remapping every old ID.
 *
 * @param conn - Connection with an open transaction.
 * @param originalTripId - The trip's ID in the backup, for logging.
 * @param newTripId - The newly-inserted trip's ID.
 * @param checklist - The trip's checklist from the backup.
 * @throws {TripImportDataError} When a check references an item or spec that
 *   was not imported.
 */
export async function importTripChecklist(
  conn: PoolConnection,
  originalTripId: number,
  newTripId: number,
  checklist: TripChecklist,
): Promise<void> {
  logger.debug('Importing checklist', {
    originalTripId,
    categoryCount: checklist.categories.length,
    occasionCount: checklist.occasions.length,
  });
  const idMaps = await insertCategories(conn, newTripId, checklist.categories);
  await insertOccasions(
    conn,
    originalTripId,
    newTripId,
    checklist.occasions,
    idMaps,
  );
}
