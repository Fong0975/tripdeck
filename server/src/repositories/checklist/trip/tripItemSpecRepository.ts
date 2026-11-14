import type {
  CreateSpecBody,
  ItemSpecResponse,
  UpdateSpecBody,
} from '../../../types/checklist';

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
  data: CreateSpecBody,
): Promise<ItemSpecResponse | null> {
  return tripSpecRepository.create(itemId, data);
}

/**
 * Renames a trip checklist item spec; `storage_location` is only changed
 * when the key is present in `data`.
 *
 * @param specId - Spec id.
 * @param data - New name and optional storage location.
 * @returns The updated spec, or null when the spec does not exist.
 */
export function updateTripItemSpec(
  specId: number,
  data: UpdateSpecBody,
): Promise<ItemSpecResponse | null> {
  return tripSpecRepository.update(specId, data);
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
