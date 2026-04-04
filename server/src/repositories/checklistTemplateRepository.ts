import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  ChecklistTemplateResponse,
  TemplateCategoryResponse,
  TemplateItemResponse,
} from '../types/checklist';

// --- Row types ---

interface TemplateCategoryRow extends RowDataPacket {
  id: number;
  name: string;
  sort_order: number;
}

interface TemplateItemRow extends RowDataPacket {
  id: number;
  checklist_template_category_id: number;
  name: string;
  sort_order: number;
}

// --- Helpers ---

function toCategoryResponse(
  row: TemplateCategoryRow,
  items: TemplateItemResponse[],
): TemplateCategoryResponse {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, items };
}

function toItemResponse(row: TemplateItemRow): TemplateItemResponse {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

// --- Repository functions ---

export async function findTemplate(): Promise<ChecklistTemplateResponse> {
  const [catRows] = await pool.execute<TemplateCategoryRow[]>(
    'SELECT * FROM checklist_template_categories ORDER BY sort_order',
  );

  if (catRows.length === 0) {
    return { categories: [] };
  }

  const catIds = catRows.map(r => r.id);
  const [itemRows] = await pool.execute<TemplateItemRow[]>(
    `SELECT * FROM checklist_template_items
     WHERE checklist_template_category_id IN (${placeholders(catIds.length)})
     ORDER BY checklist_template_category_id, sort_order`,
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
  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM checklist_template_categories',
  );
  const sortOrder = (countRows[0] as { count: number }).count;

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_categories (name, sort_order) VALUES (?, ?)',
    [name, sortOrder],
  );

  return { id: result.insertId, name, sortOrder, items: [] };
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
    'SELECT * FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY sort_order',
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
  name: string,
): Promise<TemplateItemResponse | null> {
  const [catRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  if (catRows.length === 0) {
    return null;
  }

  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM checklist_template_items WHERE checklist_template_category_id = ?',
    [catId],
  );
  const sortOrder = (countRows[0] as { count: number }).count;

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_items (checklist_template_category_id, name, sort_order) VALUES (?, ?, ?)',
    [catId, name, sortOrder],
  );

  return { id: result.insertId, name, sortOrder };
}

export async function updateItem(
  itemId: number,
  name: string,
): Promise<TemplateItemResponse | null> {
  const [rows] = await pool.execute<TemplateItemRow[]>(
    'SELECT * FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  if (rows.length === 0) {
    return null;
  }

  await pool.execute(
    'UPDATE checklist_template_items SET name = ? WHERE id = ?',
    [name, itemId],
  );

  return toItemResponse({ ...rows[0], name });
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
