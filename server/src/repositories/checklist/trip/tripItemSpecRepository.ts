import type { ChecklistSpecBody, ItemSpec } from '@tripdeck/shared';

import pool from '../../../config/database';

import { pruneSpecChecks } from './checkLocationPruning';
import { tripSpecRepository } from './shared';

/**
 * Adds a spec to a trip checklist item.
 *
 * @param itemId - Parent trip checklist item id.
 * @param data - Spec name and optional storage location.
 * @returns The created spec, or null when the item does not exist.
 */
export function createTripItemSpec(
  itemId: number,
  data: ChecklistSpecBody,
): Promise<ItemSpec | null> {
  return tripSpecRepository.create(itemId, data);
}

/**
 * Renames a trip checklist item spec; `storage_location` is only changed
 * when the key is present in `data`, in which case the spec's check marks
 * for locations it no longer has are deleted.
 *
 * @param specId - Spec id.
 * @param data - New name and optional storage location.
 * @returns The updated spec, or null when the spec does not exist.
 */
export async function updateTripItemSpec(
  specId: number,
  data: ChecklistSpecBody,
): Promise<ItemSpec | null> {
  const spec = await tripSpecRepository.update(specId, data);
  if (spec && 'storage_location' in data) {
    await pruneSpecChecks(specId, spec.storage_location);
  }
  return spec;
}

/**
 * Deletes a trip checklist item spec.
 *
 * @param specId - Spec id.
 * @returns True when a spec was deleted.
 */
export function deleteTripItemSpec(specId: number): Promise<boolean> {
  return tripSpecRepository.remove(specId);
}

/**
 * Checks that a trip spec belongs to the given trip checklist item.
 *
 * @param specId - Spec id.
 * @param itemId - Expected parent trip checklist item id.
 * @returns True when the spec exists under that item.
 */
export function verifyTripSpecBelongsToItem(
  specId: number,
  itemId: number,
): Promise<boolean> {
  return tripSpecRepository.belongsToItem(specId, itemId);
}

/**
 * Sets the checked state for a spec at one of its locations within an
 * occasion. Inserts or updates to checked=1 when true; removes the row when
 * false so the specChecks map stays sparse (only true entries).
 *
 * @param occId - Occasion id.
 * @param specId - Trip checklist item spec id.
 * @param location - One of the spec's effective locations; `''` when none.
 * @param checked - New checked state.
 */
export async function setSpecCheck(
  occId: number,
  specId: number,
  location: string,
  checked: boolean,
): Promise<void> {
  if (checked) {
    await pool.execute(
      `INSERT INTO checklist_spec_checks (checklist_occasion_id, checklist_trip_item_spec_id, location, checked)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE checked = 1`,
      [occId, specId, location],
    );
  } else {
    await pool.execute(
      'DELETE FROM checklist_spec_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_spec_id = ? AND location = ?',
      [occId, specId, location],
    );
  }
}
