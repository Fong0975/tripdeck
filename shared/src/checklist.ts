/** Storage locations a checklist item or spec can be filed under. */
export const STORAGE_OPTIONS = ['託運', '隨身'] as const;

/** One of {@link STORAGE_OPTIONS}. */
export type StorageOption = (typeof STORAGE_OPTIONS)[number];

/** Check location of a unit that has no storage location. */
export const NO_LOCATION = '';

/**
 * Lists the locations a checklist unit is filed under: the known storage
 * options contained in the comma-separated `location`, in
 * {@link STORAGE_OPTIONS} order. A unit without any known option is filed
 * under the single {@link NO_LOCATION} entry. A spec without a location of
 * its own passes its item's location instead.
 *
 * @param location - Raw `storage_location` value (e.g. `託運,隨身`).
 * @returns Non-empty list of locations, each owning an independent check.
 */
export function getEffectiveLocations(
  location: string | null | undefined,
): string[] {
  const parts = (location ?? '').split(',').map(part => part.trim());
  const options = STORAGE_OPTIONS.filter(option => parts.includes(option));
  return options.length > 0 ? options : [NO_LOCATION];
}

/**
 * Builds the key of a check mark in `ChecklistOccasion.checks` and
 * `ChecklistOccasion.specChecks`.
 *
 * @param id - Item id (checks) or spec id (specChecks).
 * @param location - One of the unit's effective locations.
 * @returns The key, e.g. `12|託運`; `12|` for {@link NO_LOCATION}.
 */
export function checkKey(id: number, location: string): string {
  return `${id}|${location}`;
}

/**
 * Splits a key built by {@link checkKey}. A key without a separator is a
 * legacy id-only key and resolves to {@link NO_LOCATION}.
 *
 * @param key - Check key.
 * @returns The id and location, or null when the id is not an integer.
 */
export function parseCheckKey(
  key: string,
): { id: number; location: string } | null {
  const separator = key.indexOf('|');
  const idPart = separator === -1 ? key : key.slice(0, separator);
  const id = Number(idPart);
  if (idPart === '' || !Number.isInteger(id)) {
    return null;
  }
  return {
    id,
    location: separator === -1 ? NO_LOCATION : key.slice(separator + 1),
  };
}

/** A variant of a checklist item (e.g. a size or colour) with its own storage location. */
export interface ItemSpec {
  id: number;
  name: string;
  storage_location: string | null;
}

/**
 * One packing checklist item. The global template and per-trip checklists
 * share this shape.
 */
export interface ChecklistItem {
  id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  storage_location: string | null;
  /** Empty when the item has no specs. */
  specs: ItemSpec[];
}

/** A named group of checklist items. */
export interface ChecklistCategory {
  id: number;
  name: string;
  items: ChecklistItem[];
}

/** Response of `GET /api/checklist-template`: the global packing template. */
export interface ChecklistTemplate {
  categories: ChecklistCategory[];
}

/** A packing occasion (e.g. "outbound", "return") with its own check marks. */
export interface ChecklistOccasion {
  id: number;
  name: string;
  /**
   * Maps `checkKey(itemId, location)` to checked state. Every effective
   * location of an item is checked independently. Only contains entries
   * explicitly set to true. Entries for items that have specs are not
   * used: such an item counts as checked when all of its specs are.
   */
  checks: Record<string, boolean>;
  /**
   * Maps `checkKey(specId, location)` to checked state. Only contains
   * entries explicitly set to true.
   */
  specChecks: Record<string, boolean>;
}

/** Response of `GET /api/trips/:tripId/checklist`. */
export interface TripChecklist {
  tripId: number;
  categories: ChecklistCategory[];
  occasions: ChecklistOccasion[];
}

/** Request body for creating or renaming a checklist category or occasion. */
export interface ChecklistNameBody {
  name: string;
}

/**
 * Request body for creating a template or trip checklist item, and for
 * updating a template item.
 */
export interface ChecklistItemBody {
  name: string;
  quantity?: number | null;
  notes?: string | null;
  storage_location?: string | null;
}

/**
 * Request body of `PUT /api/trips/:tripId/checklist/items/:itemId`. Only
 * the fields present are changed.
 */
export type UpdateTripChecklistItemBody = Partial<ChecklistItemBody>;

/** Request body for creating or updating a checklist item spec. */
export interface ChecklistSpecBody {
  name: string;
  storage_location?: string | null;
}

/**
 * Request body of `PUT .../occasions/:occId/items/:itemId/check` and
 * `PUT .../occasions/:occId/items/:itemId/specs/:specId/check`.
 */
export interface SetCheckBody {
  checked: boolean;
  /** One of the unit's effective locations; `''` when it has none. */
  location: string;
}

/**
 * Request body of the checklist reorder endpoints. `orderedIds` must list
 * every sibling (all categories, or all items of one category) exactly once,
 * in the desired order.
 */
export interface ReorderChecklistBody {
  orderedIds: number[];
}

/**
 * Request body of the checklist item move endpoints: the category the item
 * is appended to.
 */
export interface MoveChecklistItemBody {
  targetCategoryId: number;
}
