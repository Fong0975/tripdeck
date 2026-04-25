import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  ChecklistTemplateResponse,
  CreateItemBody,
  CreateSpecBody,
  ItemSpecResponse,
  TemplateCategoryResponse,
  TemplateItemResponse,
  UpdateItemBody,
  UpdateSpecBody,
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
  storage_location: string | null;
}

interface TemplateItemSpecRow extends RowDataPacket {
  id: number;
  checklist_template_item_id: number;
  name: string;
  storage_location: string | null;
}

// --- Helpers ---

function toSpecResponse(row: TemplateItemSpecRow): ItemSpecResponse {
  return {
    id: row.id,
    name: row.name,
    storage_location: row.storage_location,
  };
}

function toCategoryResponse(
  row: TemplateCategoryRow,
  items: TemplateItemResponse[],
): TemplateCategoryResponse {
  return { id: row.id, name: row.name, items };
}

function toItemResponse(
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

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

async function fetchSpecsByItemIds(
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

// --- Spec functions ---

export async function createItemSpec(
  itemId: number,
  data: CreateSpecBody,
): Promise<ItemSpecResponse | null> {
  const [itemRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_items WHERE id = ?',
    [itemId],
  );
  if (itemRows.length === 0) {
    return null;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_template_item_specs (checklist_template_item_id, name, storage_location) VALUES (?, ?, ?)',
    [itemId, data.name, data.storage_location ?? null],
  );

  return {
    id: result.insertId,
    name: data.name,
    storage_location: data.storage_location ?? null,
  };
}

export async function updateItemSpec(
  specId: number,
  data: UpdateSpecBody,
): Promise<ItemSpecResponse | null> {
  const [rows] = await pool.execute<TemplateItemSpecRow[]>(
    'SELECT * FROM checklist_template_item_specs WHERE id = ?',
    [specId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];
  const storage_location =
    'storage_location' in data
      ? (data.storage_location ?? null)
      : cur.storage_location;

  await pool.execute(
    'UPDATE checklist_template_item_specs SET name = ?, storage_location = ? WHERE id = ?',
    [data.name, storage_location, specId],
  );

  return toSpecResponse({ ...cur, name: data.name, storage_location });
}

export async function deleteItemSpec(specId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_template_item_specs WHERE id = ?',
    [specId],
  );
  return result.affectedRows > 0;
}

export async function verifySpecBelongsToItem(
  specId: number,
  itemId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_template_item_specs WHERE id = ? AND checklist_template_item_id = ?',
    [specId, itemId],
  );
  return rows.length > 0;
}
