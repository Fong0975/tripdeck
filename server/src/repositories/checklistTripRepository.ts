import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  OccasionResponse,
  TripChecklistCategoryResponse,
  TripChecklistItemResponse,
  TripChecklistResponse,
} from '../types/checklist';

// --- Row types ---

interface TripChecklistCategoryRow extends RowDataPacket {
  id: number;
  trip_id: number;
  name: string;
  sort_order: number;
}

interface TripChecklistItemRow extends RowDataPacket {
  id: number;
  checklist_trip_category_id: number;
  name: string;
  sort_order: number;
}

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

interface OccasionRow extends RowDataPacket {
  id: number;
  trip_id: number;
  name: string;
}

interface CheckRow extends RowDataPacket {
  checklist_occasion_id: number;
  checklist_trip_item_id: number;
}

// --- Helpers ---

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

// --- Repository functions ---

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
    'SELECT * FROM checklist_trip_categories WHERE trip_id = ? ORDER BY sort_order',
    [tripId],
  );

  const itemsByCatId = new Map<number, TripChecklistItemResponse[]>();
  if (catRows.length > 0) {
    const catIds = catRows.map(r => r.id);
    const [itemRows] = await pool.execute<TripChecklistItemRow[]>(
      `SELECT * FROM checklist_trip_items
       WHERE checklist_trip_category_id IN (${placeholders(catIds.length)})
       ORDER BY checklist_trip_category_id, sort_order`,
      catIds,
    );
    for (const row of itemRows) {
      const list = itemsByCatId.get(row.checklist_trip_category_id) ?? [];
      list.push({ id: row.id, name: row.name, sortOrder: row.sort_order });
      itemsByCatId.set(row.checklist_trip_category_id, list);
    }
  }

  const categories: TripChecklistCategoryResponse[] = catRows.map(row => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
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
      'SELECT * FROM checklist_template_categories ORDER BY sort_order',
    );

    for (const cat of catRows) {
      const [catResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)',
        [tripId, cat.name, cat.sort_order],
      );
      const tripCatId = catResult.insertId;

      const [itemRows] = await conn.execute<TemplateItemRow[]>(
        'SELECT * FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY sort_order',
        [cat.id],
      );
      for (const item of itemRows) {
        await conn.execute(
          'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, sort_order) VALUES (?, ?, ?)',
          [tripCatId, item.name, item.sort_order],
        );
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

/** Confirms an occasion belongs to the given trip. */
export async function verifyOccasionBelongsToTrip(
  occId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM checklist_occasions WHERE id = ? AND trip_id = ?',
    [occId, tripId],
  );
  return rows.length > 0;
}

/** Confirms a checklist item belongs to the given trip (via its category). */
export async function verifyItemBelongsToTrip(
  itemId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT cti.id FROM checklist_trip_items cti
     JOIN checklist_trip_categories ctc ON ctc.id = cti.checklist_trip_category_id
     WHERE cti.id = ? AND ctc.trip_id = ?`,
    [itemId, tripId],
  );
  return rows.length > 0;
}

export async function createOccasion(
  tripId: number,
  name: string,
): Promise<OccasionResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
    [tripId, name],
  );
  return { id: result.insertId, name, checks: {} };
}

export async function updateOccasion(
  occId: number,
  name: string,
): Promise<OccasionResponse | null> {
  const [rows] = await pool.execute<OccasionRow[]>(
    'SELECT * FROM checklist_occasions WHERE id = ?',
    [occId],
  );
  if (rows.length === 0) {
    return null;
  }

  await pool.execute('UPDATE checklist_occasions SET name = ? WHERE id = ?', [
    name,
    occId,
  ]);

  const [checkRows] = await pool.execute<CheckRow[]>(
    'SELECT checklist_trip_item_id FROM checklist_checks WHERE checklist_occasion_id = ? AND checked = 1',
    [occId],
  );
  const checks: Record<number, boolean> = {};
  for (const row of checkRows) {
    checks[row.checklist_trip_item_id] = true;
  }

  return { id: occId, name, checks };
}

export async function getOccasionCount(tripId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM checklist_occasions WHERE trip_id = ?',
    [tripId],
  );
  return (rows[0] as { count: number }).count;
}

export async function deleteOccasion(occId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM checklist_occasions WHERE id = ?',
    [occId],
  );
  return result.affectedRows > 0;
}

/**
 * Sets the checked state for an item within an occasion.
 * Inserts or updates to checked=1 when true; removes the row when false
 * so the checks map stays sparse (only true entries).
 */
export async function setCheck(
  occId: number,
  itemId: number,
  checked: boolean,
): Promise<void> {
  if (checked) {
    await pool.execute(
      `INSERT INTO checklist_checks (checklist_occasion_id, checklist_trip_item_id, checked)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE checked = 1`,
      [occId, itemId],
    );
  } else {
    await pool.execute(
      'DELETE FROM checklist_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_id = ?',
      [occId, itemId],
    );
  }
}
