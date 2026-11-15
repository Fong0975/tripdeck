import type { ChecklistSpecBody, ItemSpec } from '@tripdeck/shared';

import { templateSpecRepository } from './shared';

/**
 * Adds a spec to a template item.
 *
 * @param itemId - Parent template item id.
 * @param data - Spec name and optional storage location.
 * @returns The created spec, or null when the item does not exist.
 */
export function createItemSpec(
  itemId: number,
  data: ChecklistSpecBody,
): Promise<ItemSpec | null> {
  return templateSpecRepository.create(itemId, data);
}

/**
 * Renames a template item spec; `storage_location` is only changed when the
 * key is present in `data`.
 *
 * @param specId - Spec id.
 * @param data - New name and optional storage location.
 * @returns The updated spec, or null when the spec does not exist.
 */
export function updateItemSpec(
  specId: number,
  data: ChecklistSpecBody,
): Promise<ItemSpec | null> {
  return templateSpecRepository.update(specId, data);
}

/**
 * Deletes a template item spec.
 *
 * @param specId - Spec id.
 * @returns True when a spec was deleted.
 */
export function deleteItemSpec(specId: number): Promise<boolean> {
  return templateSpecRepository.remove(specId);
}

/**
 * Checks that a template spec belongs to the given template item.
 *
 * @param specId - Spec id.
 * @param itemId - Expected parent template item id.
 * @returns True when the spec exists under that item.
 */
export function verifySpecBelongsToItem(
  specId: number,
  itemId: number,
): Promise<boolean> {
  return templateSpecRepository.belongsToItem(specId, itemId);
}
