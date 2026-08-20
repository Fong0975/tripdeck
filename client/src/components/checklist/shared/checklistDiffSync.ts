import type { EditItem, EditSpec } from './types';

export interface EditableEntity {
  id: number;
  _deleted?: boolean;
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
   * for a freshly-added parent, since all of its children are necessarily
   * new too.
   */
  syncChildren?: (
    edited: TEdit,
    savedId: number,
    orig: TOrig | undefined,
  ) => Promise<void>;
}

/**
 * Diffs a locally-edited list against the originally-loaded list and issues
 * the matching add/update/delete API calls. Follows this app's checklist
 * editing convention: negative temp ids mark unsaved new entries, and a
 * `_deleted` flag marks entries removed locally but not yet deleted
 * server-side.
 */
export async function syncEditableList<
  TOrig extends { id: number },
  TEdit extends EditableEntity,
>(
  originals: TOrig[],
  edited: TEdit[],
  handlers: DiffSyncHandlers<TOrig, TEdit>,
): Promise<void> {
  const keptIds = new Set(
    edited.filter(e => !e._deleted && e.id > 0).map(e => e.id),
  );
  for (const orig of originals) {
    if (!keptIds.has(orig.id)) {
      await handlers.remove(orig.id);
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
    const saved = await handlers.add(e);
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
