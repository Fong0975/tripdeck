import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistTemplate,
} from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { placeholders } from '../../../utils/sql';
import { reorderSiblings, type ReorderResult } from '../shared/siblingOrder';

import {
  fetchSpecsByItemIds,
  TemplateCategoryRow,
  TemplateItemRow,
  toCategoryResponse,
  toItemResponse,
} from './shared';

export async function findTemplate(): Promise<ChecklistTemplate> {
  const [catRows] = await pool.execute<TemplateCategoryRow[]>(
    'SELECT * FROM checklist_template_categories ORDER BY sort_order, id',
  );

  if (catRows.length === 0) {
    return { categories: [] };
  }

  const catIds = catRows.map(r => r.id);
  const [itemRows] = await pool.execute<TemplateItemRow[]>(
    `SELECT * FROM checklist_template_items
     WHERE checklist_template_category_id IN (${placeholders(catIds.length)})
     ORDER BY checklist_template_category_id, sort_order, id`,
    catIds,
  );

  const specsByItemId = await fetchSpecsByItemIds(itemRows.map(r => r.id));

  const itemsByCatId = new Map<number, ChecklistItem[]>();
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

export async function createCategory(name: string): Promise<ChecklistCategory> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_categories (name, sort_order) SELECT ?, COALESCE(MAX(sort_order) + 1, 0) FROM checklist_template_categories',
    [name],
  );

  return { id: result.insertId, name, items: [] };
}

export async function updateCategory(
  catId: number,
  name: string,
): Promise<ChecklistCategory | null> {
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
    'SELECT * FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY sort_order, id',
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

/**
 * Renumbers the template categories to match `orderedIds`.
 *
 * @param orderedIds - Every template category id, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not
 *   exactly the set of existing category ids.
 */
export function reorderCategories(
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return reorderSiblings('checklist_template_categories', null, orderedIds);
}

/** Confirms a template category exists. */
export async function categoryExists(catId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_categories WHERE id = ?',
    [catId],
  );
  return rows.length > 0;
}
