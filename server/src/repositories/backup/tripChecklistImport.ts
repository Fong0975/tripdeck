import {
  type ChecklistCategory,
  type ChecklistOccasion,
  checkKey,
  getEffectiveLocations,
  parseCheckKey,
  type TripChecklist,
} from '@tripdeck/shared';
import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../logger';
import { bulkInsert } from '../../utils/bulkInsert';

import { consistencyError } from './tripImportHelpers';

const logger = createLogger('backup');

/**
 * Old (backup) checklist item and spec IDs mapped to their new IDs, plus the
 * raw storage location each unit is filed under (a spec without its own
 * location follows its item).
 */
interface ChecklistIdMaps {
  itemIdMap: Map<number, number>;
  specIdMap: Map<number, number>;
  itemLocations: Map<number, string | null>;
  specLocations: Map<number, string | null>;
}

/**
 * Inserts the checklist categories, items and specs under `newTripId`.
 * Every row goes in one at a time because the new item and spec IDs are
 * needed to remap the occasions' checks.
 *
 * @returns Old (backup) item and spec IDs -> newly-inserted IDs, and the
 *   storage locations of those units.
 */
async function insertCategories(
  conn: PoolConnection,
  newTripId: number,
  categories: ChecklistCategory[],
): Promise<ChecklistIdMaps> {
  const itemIdMap = new Map<number, number>();
  const specIdMap = new Map<number, number>();
  const itemLocations = new Map<number, string | null>();
  const specLocations = new Map<number, string | null>();
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
      itemLocations.set(item.id, item.storage_location);

      for (const spec of item.specs) {
        const [specResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
          [newItemId, spec.name, spec.storage_location],
        );
        specIdMap.set(spec.id, specResult.insertId);
        specLocations.set(
          spec.id,
          spec.storage_location ?? item.storage_location,
        );
      }
    }
  }
  return { itemIdMap, specIdMap, itemLocations, specLocations };
}

/** The imported units a family of checks (item checks or spec checks) refers to. */
interface CheckTargets {
  /** Human-readable unit name for error messages, e.g. `checklist item`. */
  label: string;
  idMap: Map<number, number>;
  locations: Map<number, string | null>;
}

/**
 * Resolves the check keys of one occasion to `[newId, location]` pairs.
 * A `id|location` key is kept at its location, which must be one of the
 * unit's locations. A legacy id-only key (backups from before checks were
 * per location) is spread over every location of the unit. Pairs reached
 * through several keys are returned once, as the table's unique key requires.
 *
 * @throws {TripImportDataError} When a key is malformed, references a unit
 *   that was not imported, or names a location the unit does not have.
 */
function resolveChecks(
  checks: Record<string, boolean>,
  targets: CheckTargets,
  originalTripId: number,
  occasionId: number,
): Array<[newId: number, location: string]> {
  const resolved = new Map<string, [number, string]>();
  const add = (newId: number, location: string): void => {
    resolved.set(checkKey(newId, location), [newId, location]);
  };
  for (const [key, checked] of Object.entries(checks)) {
    if (!checked) {
      continue;
    }
    const parsed = parseCheckKey(key);
    const newId = parsed ? targets.idMap.get(parsed.id) : undefined;
    if (!parsed || newId === undefined) {
      throw consistencyError(
        originalTripId,
        `Occasion ${occasionId} references ${targets.label} ${key} that was not imported`,
      );
    }
    const locations = getEffectiveLocations(targets.locations.get(parsed.id));
    if (!key.includes('|')) {
      locations.forEach(location => add(newId, location));
    } else if (locations.includes(parsed.location)) {
      add(newId, parsed.location);
    } else {
      throw consistencyError(
        originalTripId,
        `Occasion ${occasionId} checks ${targets.label} ${parsed.id} at location "${parsed.location}" that it does not have`,
      );
    }
  }
  return [...resolved.values()];
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
  { itemIdMap, specIdMap, itemLocations, specLocations }: ChecklistIdMaps,
): Promise<void> {
  const checkRows: unknown[][] = [];
  const specCheckRows: unknown[][] = [];
  for (const occasion of occasions) {
    const [occasionResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
      [newTripId, occasion.name],
    );
    const newOccasionId = occasionResult.insertId;

    const itemChecks = resolveChecks(
      occasion.checks,
      { label: 'checklist item', idMap: itemIdMap, locations: itemLocations },
      originalTripId,
      occasion.id,
    );
    for (const [newItemId, location] of itemChecks) {
      checkRows.push([newOccasionId, newItemId, location, 1]);
    }

    // Backups made before spec checks existed omit the field.
    const specChecks = resolveChecks(
      occasion.specChecks ?? {},
      { label: 'checklist spec', idMap: specIdMap, locations: specLocations },
      originalTripId,
      occasion.id,
    );
    for (const [newSpecId, location] of specChecks) {
      specCheckRows.push([newOccasionId, newSpecId, location, 1]);
    }
  }
  await bulkInsert(
    conn,
    'checklist_checks',
    ['checklist_occasion_id', 'checklist_trip_item_id', 'location', 'checked'],
    checkRows,
  );
  await bulkInsert(
    conn,
    'checklist_spec_checks',
    [
      'checklist_occasion_id',
      'checklist_trip_item_spec_id',
      'location',
      'checked',
    ],
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
