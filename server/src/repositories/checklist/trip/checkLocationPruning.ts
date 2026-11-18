import { getEffectiveLocations } from '@tripdeck/shared';

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
 * Drops the check marks of a trip checklist item for locations the item no
 * longer has. Call it after the item's storage location changed.
 *
 * @param itemId - Trip checklist item id.
 * @param itemLocation - The item's new raw storage location.
 */
export function pruneItemChecks(
  itemId: number,
  itemLocation: string | null,
): Promise<void> {
  return deleteChecksOutsideLocations(
    'checklist_checks',
    'checklist_trip_item_id',
    itemId,
    itemLocation,
  );
}

/**
 * Drops the check marks of a trip checklist spec for locations it no longer
 * has. Call it after the spec's storage location changed.
 *
 * @param specId - Trip checklist item spec id.
 * @param specLocation - The spec's new raw storage location.
 */
export function pruneSpecChecks(
  specId: number,
  specLocation: string | null,
): Promise<void> {
  return deleteChecksOutsideLocations(
    'checklist_spec_checks',
    'checklist_trip_item_spec_id',
    specId,
    specLocation,
  );
}
