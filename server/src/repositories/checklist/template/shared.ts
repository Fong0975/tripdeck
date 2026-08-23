import type { RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type {
  ItemSpecResponse,
  TemplateCategoryResponse,
  TemplateItemResponse,
} from '../../../types/checklist';

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

export interface TemplateItemSpecRow extends RowDataPacket {
  id: number;
  checklist_template_item_id: number;
  name: string;
  storage_location: string | null;
}

// --- Helpers ---

export function toSpecResponse(row: TemplateItemSpecRow): ItemSpecResponse {
  return {
    id: row.id,
    name: row.name,
    storage_location: row.storage_location,
  };
}

export function toCategoryResponse(
  row: TemplateCategoryRow,
  items: TemplateItemResponse[],
): TemplateCategoryResponse {
  return { id: row.id, name: row.name, items };
}

export function toItemResponse(
  row: TemplateItemRow,
  specs: ItemSpecResponse[],
): TemplateItemResponse {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    notes: row.notes,
    storage_location: row.storage_location,
    specs,
  };
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

export async function fetchSpecsByItemIds(
  itemIds: number[],
): Promise<Map<number, ItemSpecResponse[]>> {
  const map = new Map<number, ItemSpecResponse[]>();
  if (itemIds.length === 0) {
    return map;
  }
  const [rows] = await pool.execute<TemplateItemSpecRow[]>(
    `SELECT * FROM checklist_template_item_specs
     WHERE checklist_template_item_id IN (${placeholders(itemIds.length)})
     ORDER BY checklist_template_item_id, id`,
    itemIds,
  );
  for (const row of rows) {
    const list = map.get(row.checklist_template_item_id) ?? [];
    list.push(toSpecResponse(row));
    map.set(row.checklist_template_item_id, list);
  }
  return map;
}
