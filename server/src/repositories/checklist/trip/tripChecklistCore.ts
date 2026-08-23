import type { ResultSetHeader } from 'mysql2';

import pool from '../../../config/database';
import type {
  OccasionResponse,
  TripChecklistCategoryResponse,
  TripChecklistItemResponse,
  TripChecklistResponse,
} from '../../../types/checklist';

import {
  CheckRow,
  fetchSpecsByItemIds,
  OccasionRow,
  placeholders,
  TemplateCategoryRow,
  TemplateItemRow,
  TemplateItemSpecRow,
  TripChecklistCategoryRow,
  TripChecklistItemRow,
} from './shared';

/**
 * Returns the full checklist for a trip.
 * Returns null if no occasions exist (checklist not yet initialized).
 */
export async function findChecklist(
  tripId: number,
): Promise<TripChecklistResponse | null> {
  const [occRows] = await pool.execute<OccasionRow[]>(
    'SELECT * FROM checklist_occasions WHERE trip_id = ? ORDER BY id',
    [tripId],
  );
  if (occRows.length === 0) {
    return null;
  }

  const [catRows] = await pool.execute<TripChecklistCategoryRow[]>(
    'SELECT * FROM checklist_trip_categories WHERE trip_id = ? ORDER BY id',
    [tripId],
  );

  const itemsByCatId = new Map<number, TripChecklistItemResponse[]>();
  if (catRows.length > 0) {
    const catIds = catRows.map(r => r.id);
    const [itemRows] = await pool.execute<TripChecklistItemRow[]>(
      `SELECT * FROM checklist_trip_items
       WHERE checklist_trip_category_id IN (${placeholders(catIds.length)})
       ORDER BY checklist_trip_category_id, id`,
      catIds,
    );

    const specsByItemId = await fetchSpecsByItemIds(itemRows.map(r => r.id));

    for (const row of itemRows) {
      const list = itemsByCatId.get(row.checklist_trip_category_id) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        notes: row.notes,
        storage_location: row.storage_location,
        specs: specsByItemId.get(row.id) ?? [],
      });
      itemsByCatId.set(row.checklist_trip_category_id, list);
    }
  }

  const categories: TripChecklistCategoryResponse[] = catRows.map(row => ({
    id: row.id,
    name: row.name,
    items: itemsByCatId.get(row.id) ?? [],
  }));

  // Fetch only checked=1 rows; missing entries are implicitly unchecked.
  const occIds = occRows.map(r => r.id);
  const checksByOccId = new Map<number, Record<number, boolean>>();
  if (occIds.length > 0) {
    const [checkRows] = await pool.execute<CheckRow[]>(
      `SELECT checklist_occasion_id, checklist_trip_item_id
       FROM checklist_checks
       WHERE checklist_occasion_id IN (${placeholders(occIds.length)}) AND checked = 1`,
      occIds,
    );
    for (const row of checkRows) {
      const map = checksByOccId.get(row.checklist_occasion_id) ?? {};
      map[row.checklist_trip_item_id] = true;
      checksByOccId.set(row.checklist_occasion_id, map);
    }
  }

  const occasions: OccasionResponse[] = occRows.map(row => ({
    id: row.id,
    name: row.name,
    checks: checksByOccId.get(row.id) ?? {},
  }));

  return { tripId, categories, occasions };
}

/**
 * Copies the current template into a new trip checklist and creates a
 * default occasion. Called automatically when no occasions exist for a trip.
 */
export async function initChecklist(
  tripId: number,
): Promise<TripChecklistResponse> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [catRows] = await conn.execute<TemplateCategoryRow[]>(
      'SELECT * FROM checklist_template_categories ORDER BY id',
    );

    for (const cat of catRows) {
      const [catResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
        [tripId, cat.name],
      );
      const tripCatId = catResult.insertId;

      const [itemRows] = await conn.execute<TemplateItemRow[]>(
        'SELECT * FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY id',
        [cat.id],
      );
      for (const item of itemRows) {
        const [itemResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
          [
            tripCatId,
            item.name,
            item.quantity,
            item.notes,
            item.storage_location,
          ],
        );
        const tripItemId = itemResult.insertId;

        const [specRows] = await conn.execute<TemplateItemSpecRow[]>(
          'SELECT * FROM checklist_template_item_specs WHERE checklist_template_item_id = ? ORDER BY id',
          [item.id],
        );
        for (const spec of specRows) {
          await conn.execute(
            'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
            [tripItemId, spec.name, spec.storage_location],
          );
        }
      }
    }

    await conn.execute(
      "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')",
      [tripId],
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return (await findChecklist(tripId)) as TripChecklistResponse;
}

/**
 * Returns the existing checklist or initializes one from the current template
 * if none exists yet.
 */
export async function findOrInitChecklist(
  tripId: number,
): Promise<TripChecklistResponse> {
  const existing = await findChecklist(tripId);
  if (existing) {
    return existing;
  }
  return initChecklist(tripId);
}
