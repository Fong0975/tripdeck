import { getEffectiveLocations, type ItemSpec } from '@tripdeck/shared';
import type { RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { placeholders } from '../../../utils/sql';

/**
 * Deletes the check marks of one item or spec whose location is no longer
 * among the unit's effective locations.
 *
 * @param table - `checklist_checks` or `checklist_spec_checks` (trusted
 *   constant, interpolated into SQL).
 * @param idColumn - Column referencing the item or spec (trusted constant).
 * @param id - Item or spec id.
 * @param storageLocation - Raw storage location the unit is now filed under.
 */
async function deleteChecksOutsideLocations(
  table: 'checklist_checks' | 'checklist_spec_checks',
  idColumn: 'checklist_trip_item_id' | 'checklist_trip_item_spec_id',
  id: number,
  storageLocation: string | null,
): Promise<void> {
  const locations = getEffectiveLocations(storageLocation);
  await pool.execute(
    `DELETE FROM ${table}
     WHERE ${idColumn} = ? AND location NOT IN (${placeholders(locations.length)})`,
    [id, ...locations],
  );
}

/**
 * Drops the check marks of a trip checklist item, and of its specs that
 * inherit the item's location, for locations the item no longer has. Call it
 * after the item's storage location changed.
 *
 * @param itemId - Trip checklist item id.
 * @param itemLocation - The item's new raw storage location.
 * @param specs - The item's specs; a spec without a location of its own
 *   follows `itemLocation`.
 */
export async function pruneItemChecks(
  itemId: number,
  itemLocation: string | null,
  specs: readonly ItemSpec[],
): Promise<void> {
  await deleteChecksOutsideLocations(
    'checklist_checks',
    'checklist_trip_item_id',
    itemId,
    itemLocation,
  );
  for (const spec of specs) {
    if (spec.storage_location === null) {
      await deleteChecksOutsideLocations(
        'checklist_spec_checks',
        'checklist_trip_item_spec_id',
        spec.id,
        itemLocation,
      );
    }
  }
}

/**
 * Drops the check marks of a trip checklist spec for locations it no longer
 * has. Call it after the spec's storage location changed.
 *
 * @param specId - Trip checklist item spec id.
 * @param specLocation - The spec's new raw storage location; null makes it
 *   inherit the location of its item.
 */
export async function pruneSpecChecks(
  specId: number,
  specLocation: string | null,
): Promise<void> {
  let effectiveLocation = specLocation;
  if (effectiveLocation === null) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT i.storage_location FROM checklist_trip_items i
       JOIN checklist_trip_item_specs s ON s.checklist_trip_item_id = i.id
       WHERE s.id = ?`,
      [specId],
    );
    effectiveLocation =
      (rows[0] as { storage_location: string | null } | undefined)
        ?.storage_location ?? null;
  }
  await deleteChecksOutsideLocations(
    'checklist_spec_checks',
    'checklist_trip_item_spec_id',
    specId,
    effectiveLocation,
  );
}
