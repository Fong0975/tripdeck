import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  ChecklistTemplateResponse,
  CreateItemBody,
  TemplateCategoryResponse,
  TemplateItemResponse,
  UpdateItemBody,
} from '../types/checklist';

// --- Row types ---

interface TemplateCategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface TemplateItemRow extends RowDataPacket {
  id: number;
  checklist_template_category_id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
}

// --- Helpers ---

function toCategoryResponse(
  row: TemplateCategoryRow,
  items: TemplateItemResponse[],
): TemplateCategoryResponse {
  return { id: row.id, name: row.name, items };
}

function toItemResponse(row: TemplateItemRow): TemplateItemResponse {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    notes: row.notes,
  };
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

// --- Repository functions ---

export async function findTemplate(): Promise<ChecklistTemplateResponse> {
  const [catRows] = await pool.execute<TemplateCategoryRow[]>(
    'SELECT * FROM checklist_template_categories ORDER BY id',
  );

  if (catRows.length === 0) {
    return { categories: [] };
  }

  const catIds = catRows.map(r => r.id);
  const [itemRows] = await pool.execute<TemplateItemRow[]>(
    `SELECT * FROM checklist_template_items
     WHERE checklist_template_category_id IN (${placeholders(catIds.length)})
     ORDER BY checklist_template_category_id, id`,
    catIds,
  );

  const itemsByCatId = new Map<number, TemplateItemResponse[]>();
  for (const row of itemRows) {
    const list = itemsByCatId.get(row.checklist_template_category_id) ?? [];
    list.push(toItemResponse(row));
    itemsByCatId.set(row.checklist_template_category_id, list);
  }

  const categories = catRows.map(row =>
    toCategoryResponse(row, itemsByCatId.get(row.id) ?? []),
  );

  return { categories };
}

export async function createCategory(
  name: string,
): Promise<TemplateCategoryResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_categories (name) VALUES (?)',
    [name],
  );

  return { id: result.insertId, name, items: [] };
}

export async function updateCategory(
  catId: number,
  name: string,
): Promise<TemplateCategoryResponse | null> {
  const [rows] = await pool.execute<TemplateCategoryRow[]>(
    'SELECT * FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  if (rows.length === 0) {
    return null;
  }

  await pool.execute(
    'UPDATE checklist_template_categories SET name = ? WHERE id = ?',
    [name, catId],
  );

  const [itemRows] = await pool.execute<TemplateItemRow[]>(
    'SELECT * FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY id',
    [catId],
  );

  return toCategoryResponse({ ...rows[0], name }, itemRows.map(toItemResponse));
}

export async function deleteCategory(catId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  return result.affectedRows > 0;
}

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
    'INSERT INTO checklist_template_items (checklist_template_category_id, name, quantity, notes) VALUES (?, ?, ?, ?)',
    [catId, data.name, data.quantity ?? null, data.notes ?? null],
  );

  return {
    id: result.insertId,
    name: data.name,
    quantity: data.quantity ?? null,
    notes: data.notes ?? null,
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

  await pool.execute(
    'UPDATE checklist_template_items SET name = ?, quantity = ?, notes = ? WHERE id = ?',
    [data.name, quantity, notes, itemId],
  );

  return toItemResponse({ ...cur, name: data.name, quantity, notes });
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
