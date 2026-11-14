import type { EditItem, EditSpec } from './types';

export interface EditableEntity {
  id: number;
  _deleted?: boolean;
}

/**
 * Remembers which non-idempotent calls of a diff sync already succeeded, so
 * re-running the same sync after a mid-way failure neither re-creates
 * entries (duplicates) nor re-deletes them (404). Updates are idempotent and
 * are simply re-issued.
 *
 * Use one tracker per entity kind (occasions, categories, items, specs):
 * server ids are only unique per table, while temp ids are globally unique.
 * Keep the trackers alive across save attempts for the same edit session.
 */
export interface SyncTracker<TOrig extends { id: number }> {
  /** Server ids whose delete call already succeeded. */
  removed: Set<number>;
  /** Temp (negative) id → the entity the server created for it. */
  added: Map<number, TOrig>;
}

/** Creates an empty {@link SyncTracker}. */
export function createSyncTracker<
  TOrig extends { id: number },
>(): SyncTracker<TOrig> {
  return { removed: new Set(), added: new Map() };
}

export interface DiffSyncHandlers<
  TOrig extends { id: number },
  TEdit extends EditableEntity,
> {
  add: (edited: TEdit) => Promise<TOrig>;
  /** Return value is ignored — some update endpoints resolve void, others resolve the updated entity. */
  update: (id: number, edited: TEdit, orig: TOrig) => Promise<unknown>;
  remove: (id: number) => Promise<void>;
  isChanged: (edited: TEdit, orig: TOrig) => boolean;
  /**
   * Diffs a nested list belonging to this entry (e.g. an item's specs)
   * against the same original/edited convention. Called for every kept or
   * newly-added entry, after its own update/add call. `orig` is undefined
   * for a newly-added parent, since all of its children are necessarily
   * new too.
   */
  syncChildren?: (
    edited: TEdit,
    savedId: number,
    orig: TOrig | undefined,
  ) => Promise<void>;
  /** Makes the sync safe to retry after a partial failure; see {@link SyncTracker}. */
  tracker?: SyncTracker<TOrig>;
}

/**
 * Diffs a locally-edited list against the originally-loaded list and issues
 * the matching add/update/delete API calls. Follows this app's checklist
 * editing convention: negative temp ids mark unsaved new entries, and a
 * `_deleted` flag marks entries removed locally but not yet deleted
 * server-side.
 *
 * With a `tracker`, a retry skips deletes and creates that already
 * succeeded (a previously-created entry is updated instead if it was edited
 * since, and deleted if it was removed locally since).
 */
export async function syncEditableList<
  TOrig extends { id: number },
  TEdit extends EditableEntity,
>(
  originals: TOrig[],
  edited: TEdit[],
  handlers: DiffSyncHandlers<TOrig, TEdit>,
): Promise<void> {
  const { tracker } = handlers;

  const keptIds = new Set(
    edited.filter(e => !e._deleted && e.id > 0).map(e => e.id),
  );
  for (const orig of originals) {
    if (!keptIds.has(orig.id) && !tracker?.removed.has(orig.id)) {
      await handlers.remove(orig.id);
      tracker?.removed.add(orig.id);
    }
  }

  for (const e of edited.filter(e => e._deleted && e.id < 0)) {
    const created = tracker?.added.get(e.id);
    if (created) {
      await handlers.remove(created.id);
      tracker?.added.delete(e.id);
    }
  }

  for (const e of edited.filter(e => !e._deleted && e.id > 0)) {
    const orig = originals.find(o => o.id === e.id);
    if (!orig) {
      continue;
    }
    if (handlers.isChanged(e, orig)) {
      await handlers.update(e.id, e, orig);
    }
    if (handlers.syncChildren) {
      await handlers.syncChildren(e, e.id, orig);
    }
  }

  for (const e of edited.filter(e => !e._deleted && e.id < 0)) {
    let saved = tracker?.added.get(e.id);
    if (!saved) {
      saved = await handlers.add(e);
      tracker?.added.set(e.id, saved);
    } else if (handlers.isChanged(e, saved)) {
      await handlers.update(saved.id, e, saved);
    }
    if (handlers.syncChildren) {
      await handlers.syncChildren(e, saved.id, undefined);
    }
  }
}

// --- Shared field-diff / payload helpers for checklist items & specs ---

interface ItemFieldsSource {
  name: string;
  quantity?: number | null;
  notes?: string | null;
  storage_location?: string | null;
}

export function itemFieldsChanged(
  edited: EditItem,
  orig: ItemFieldsSource,
): boolean {
  return (
    edited.name.trim() !== orig.name ||
    edited.quantity !== (orig.quantity ?? null) ||
    (edited.notes ?? null) !== (orig.notes ?? null) ||
    (edited.storage_location ?? null) !== (orig.storage_location ?? null)
  );
}

export function itemPayload(edited: EditItem, fallbackName: string) {
  return {
    name: edited.name.trim() || fallbackName,
    quantity: edited.quantity,
    notes: edited.notes ?? null,
    storage_location: edited.storage_location,
  };
}

interface SpecFieldsSource {
  name: string;
  storage_location?: string | null;
}

export function specFieldsChanged(
  edited: EditSpec,
  orig: SpecFieldsSource,
): boolean {
  return (
    edited.name.trim() !== orig.name ||
    (edited.storage_location ?? null) !== (orig.storage_location ?? null)
  );
}

export function specPayload(edited: EditSpec, fallbackName = '新規格') {
  return {
    name: edited.name.trim() || fallbackName,
    storage_location: edited.storage_location,
  };
}
