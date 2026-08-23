import type { ResultSetHeader } from 'mysql2';

import pool from '../../../config/database';
import type {
  ChecklistTemplateResponse,
  TemplateCategoryResponse,
  TemplateItemResponse,
} from '../../../types/checklist';

import {
  fetchSpecsByItemIds,
  placeholders,
  TemplateCategoryRow,
  TemplateItemRow,
  toCategoryResponse,
  toItemResponse,
} from './shared';

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

  const specsByItemId = await fetchSpecsByItemIds(itemRows.map(r => r.id));

  const itemsByCatId = new Map<number, TemplateItemResponse[]>();
  for (const row of itemRows) {
    const list = itemsByCatId.get(row.checklist_template_category_id) ?? [];
    list.push(toItemResponse(row, specsByItemId.get(row.id) ?? []));
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

  const specsByItemId = await fetchSpecsByItemIds(itemRows.map(r => r.id));

  return toCategoryResponse(
    { ...rows[0], name },
    itemRows.map(r => toItemResponse(r, specsByItemId.get(r.id) ?? [])),
  );
}

export async function deleteCategory(catId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  return result.affectedRows > 0;
}
