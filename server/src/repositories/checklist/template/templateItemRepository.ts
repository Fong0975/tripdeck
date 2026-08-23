import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import type {
  CreateItemBody,
  TemplateItemResponse,
  UpdateItemBody,
} from '../../../types/checklist';

import { fetchSpecsByItemIds, TemplateItemRow, toItemResponse } from './shared';

export async function createItem(
  catId: number,
  data: CreateItemBody,
): Promise<TemplateItemResponse | null> {
  const [catRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  if (catRows.length === 0) {
    return null;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_items (checklist_template_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
    [
      catId,
      data.name,
      data.quantity ?? null,
      data.notes ?? null,
      data.storage_location ?? null,
    ],
  );

  return {
    id: result.insertId,
    name: data.name,
    quantity: data.quantity ?? null,
    notes: data.notes ?? null,
    storage_location: data.storage_location ?? null,
    specs: [],
  };
}

export async function updateItem(
  itemId: number,
  data: UpdateItemBody,
): Promise<TemplateItemResponse | null> {
  const [rows] = await pool.execute<TemplateItemRow[]>(
    'SELECT * FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];
  const quantity = 'quantity' in data ? (data.quantity ?? null) : cur.quantity;
  const notes = 'notes' in data ? (data.notes ?? null) : cur.notes;
  const storage_location =
    'storage_location' in data
      ? (data.storage_location ?? null)
      : cur.storage_location;

  await pool.execute(
    'UPDATE checklist_template_items SET name = ?, quantity = ?, notes = ?, storage_location = ? WHERE id = ?',
    [data.name, quantity, notes, storage_location, itemId],
  );

  const specsByItemId = await fetchSpecsByItemIds([itemId]);

  return toItemResponse(
    { ...cur, name: data.name, quantity, notes, storage_location },
    specsByItemId.get(itemId) ?? [],
  );
}

export async function deleteItem(itemId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  return result.affectedRows > 0;
}

/**
 * Verifies that an item belongs to a category. Used to validate nested routes.
 */
export async function verifyItemBelongsToCategory(
  itemId: number,
  catId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_items WHERE id = ? AND checklist_template_category_id = ?',
    [itemId, catId],
  );
  return rows.length > 0;
}
