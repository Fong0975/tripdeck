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
   * Maps trip checklist item id to checked state. Only contains items
   * explicitly set to true. Entries for items that have specs are not
   * used: such an item counts as checked when all of its specs are.
   */
  checks: Record<number, boolean>;
  /**
   * Maps trip checklist item spec id to checked state. Only contains specs
   * explicitly set to true.
   */
  specChecks: Record<number, boolean>;
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
