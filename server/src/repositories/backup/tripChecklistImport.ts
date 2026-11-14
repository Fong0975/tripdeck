import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../logger';
import type {
  OccasionResponse,
  TripChecklistCategoryResponse,
  TripChecklistResponse,
} from '../../types/checklist';
import { bulkInsert } from '../../utils/bulkInsert';

import { consistencyError } from './tripImportHelpers';

const logger = createLogger('backup');

/**
 * Inserts the checklist categories, items and specs under `newTripId`.
 * Categories and items go in one row at a time (their new IDs are needed);
 * the leaf spec rows are sent as one multi-row insert at the end.
 *
 * @returns Old (backup) item ID -> newly-inserted item ID.
 */
async function insertCategories(
  conn: PoolConnection,
  newTripId: number,
  categories: TripChecklistCategoryResponse[],
): Promise<Map<number, number>> {
  const itemIdMap = new Map<number, number>();
  const specRows: unknown[][] = [];
  for (const category of categories) {
    const [categoryResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
      [newTripId, category.name],
    );
    const newCategoryId = categoryResult.insertId;

    for (const item of category.items) {
      const [itemResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
        [
          newCategoryId,
          item.name,
          item.quantity,
          item.notes,
          item.storage_location,
        ],
      );
      const newItemId = itemResult.insertId;
      itemIdMap.set(item.id, newItemId);

      for (const spec of item.specs) {
        specRows.push([newItemId, spec.name, spec.storage_location]);
      }
    }
  }
  await bulkInsert(
    conn,
    'checklist_trip_item_specs',
    ['checklist_trip_item_id', 'name', 'storage_location'],
    specRows,
  );
  return itemIdMap;
}

/**
 * Inserts the checklist occasions and their checked items, remapping item
 * IDs through `itemIdMap`. Unchecked entries are skipped. Occasions go in
 * one row at a time (their new IDs are needed); the leaf check rows are sent
 * as one multi-row insert at the end.
 *
 * @throws {TripImportDataError} When a check references an item that was
 *   not imported.
 */
async function insertOccasions(
  conn: PoolConnection,
  originalTripId: number,
  newTripId: number,
  occasions: OccasionResponse[],
  itemIdMap: Map<number, number>,
): Promise<void> {
  const checkRows: unknown[][] = [];
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
  }
  await bulkInsert(
    conn,
    'checklist_checks',
    ['checklist_occasion_id', 'checklist_trip_item_id', 'checked'],
    checkRows,
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
 * @throws {TripImportDataError} When a check references an item that was
 *   not imported.
 */
export async function importTripChecklist(
  conn: PoolConnection,
  originalTripId: number,
  newTripId: number,
  checklist: TripChecklistResponse,
): Promise<void> {
  logger.debug('Importing checklist', {
    originalTripId,
    categoryCount: checklist.categories.length,
    occasionCount: checklist.occasions.length,
  });
  const itemIdMap = await insertCategories(
    conn,
    newTripId,
    checklist.categories,
  );
  await insertOccasions(
    conn,
    originalTripId,
    newTripId,
    checklist.occasions,
    itemIdMap,
  );
}
