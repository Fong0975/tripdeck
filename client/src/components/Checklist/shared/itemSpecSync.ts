import type { ChecklistItem, ItemSpec } from '@/types';

import {
  createSyncTracker,
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
  type SyncTracker,
} from './checklistDiffSync';
import type { EditItem } from './types';

type ItemBody = ReturnType<typeof itemPayload>;
type SpecBody = ReturnType<typeof specPayload>;

/**
 * The item/spec API calls of one checklist category, with any
 * scope-specific ids (template category, trip + category) already bound.
 */
export interface ItemSpecApi {
  addItem: (data: ItemBody) => Promise<ChecklistItem>;
  /** Return value is ignored. */
  updateItem: (itemId: number, data: ItemBody) => Promise<unknown>;
  removeItem: (itemId: number) => Promise<void>;
  addSpec: (itemId: number, data: SpecBody) => Promise<ItemSpec>;
  /** Return value is ignored. */
  updateSpec: (
    itemId: number,
    specId: number,
    data: SpecBody,
  ) => Promise<unknown>;
  removeSpec: (itemId: number, specId: number) => Promise<void>;
}

/** Per-entity-kind sync trackers for items and their specs. */
export interface ItemSpecTrackers {
  items: SyncTracker<ChecklistItem>;
  specs: SyncTracker<ItemSpec>;
}

/** Creates empty {@link ItemSpecTrackers}. */
export function createItemSpecTrackers(): ItemSpecTrackers {
  return {
    items: createSyncTracker<ChecklistItem>(),
    specs: createSyncTracker<ItemSpec>(),
  };
}

/**
 * Builds a diff sync for one category's items and, nested under each item,
 * its specs, issuing the calls through the given API adapter.
 *
 * @param api - The bound item/spec API calls for the category.
 * @param trackers - Retry trackers; keep them alive across save attempts of
 *   the same edit session so a retry is idempotent.
 * @returns A function that syncs `edited` items against `originals`.
 */
export function makeItemSpecSync(
  api: ItemSpecApi,
  trackers: ItemSpecTrackers,
): (originals: ChecklistItem[], edited: EditItem[]) => Promise<void> {
  return (originals, edited) =>
    syncEditableList(originals, edited, {
      isChanged: itemFieldsChanged,
      update: (itemId, editItem, origItem) =>
        api.updateItem(itemId, itemPayload(editItem, origItem.name)),
      add: editItem => api.addItem(itemPayload(editItem, '新項目')),
      remove: itemId => api.removeItem(itemId),
      tracker: trackers.items,
      syncChildren: (editItem, itemId, origItem) =>
        syncEditableList(origItem?.specs ?? [], editItem.specs, {
          isChanged: specFieldsChanged,
          update: (specId, editSpec, origSpec) =>
            api.updateSpec(
              itemId,
              specId,
              specPayload(editSpec, origSpec.name),
            ),
          add: editSpec => api.addSpec(itemId, specPayload(editSpec)),
          remove: specId => api.removeSpec(itemId, specId),
          tracker: trackers.specs,
        }),
    });
}
