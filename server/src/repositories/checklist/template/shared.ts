import type {
  ChecklistCategory,
  ChecklistItem,
  ItemSpec,
} from '@tripdeck/shared';
import type { RowDataPacket } from 'mysql2';

import {
  createSpecRepository,
  type ItemSpecRow,
} from '../shared/specRepository';

// --- Row types ---

export interface TemplateCategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

export interface TemplateItemRow extends RowDataPacket {
  id: number;
  checklist_template_category_id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  storage_location: string | null;
}

export interface TemplateItemSpecRow extends ItemSpecRow {
  checklist_template_item_id: number;
}

// --- Helpers ---

/** Spec operations bound to the checklist template spec table. */
export const templateSpecRepository = createSpecRepository({
  specTable: 'checklist_template_item_specs',
  itemTable: 'checklist_template_items',
  parentColumn: 'checklist_template_item_id',
});

export function toCategoryResponse(
  row: TemplateCategoryRow,
  items: ChecklistItem[],
): ChecklistCategory {
  return { id: row.id, name: row.name, items };
}

export function toItemResponse(
  row: TemplateItemRow,
  specs: ItemSpec[],
): ChecklistItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    notes: row.notes,
    storage_location: row.storage_location,
    specs,
  };
}

/**
 * Loads the specs of the given template items, grouped by item id.
 *
 * @param itemIds - Template item ids.
 * @returns Map of item id to its specs, ordered by spec id.
 */
export function fetchSpecsByItemIds(
  itemIds: number[],
): Promise<Map<number, ItemSpec[]>> {
  return templateSpecRepository.fetchByItemIds(itemIds);
}
