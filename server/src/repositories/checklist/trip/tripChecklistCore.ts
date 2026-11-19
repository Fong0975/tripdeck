import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  TripChecklist,
} from '@tripdeck/shared';

import pool from '../../../config/database';
import { placeholders } from '../../../utils/sql';

import {
  fetchChecksByOccasionIds,
  fetchSpecChecksByOccasionIds,
  fetchSpecsByItemIds,
  OccasionRow,
  TripChecklistCategoryRow,
  TripChecklistItemRow,
} from './shared';

/**
 * Returns the full checklist for a trip.
 * Returns null if no occasions exist (the trip has no checklist yet, e.g. it
 * was created before checklists were built at trip creation).
 */
export async function findChecklist(
  tripId: number,
): Promise<TripChecklist | null> {
  const [occRows] = await pool.execute<OccasionRow[]>(
    'SELECT * FROM checklist_occasions WHERE trip_id = ? ORDER BY id',
    [tripId],
  );
  if (occRows.length === 0) {
    return null;
  }

  const [catRows] = await pool.execute<TripChecklistCategoryRow[]>(
    'SELECT * FROM checklist_trip_categories WHERE trip_id = ? ORDER BY sort_order, id',
    [tripId],
  );

  const itemsByCatId = new Map<number, ChecklistItem[]>();
  if (catRows.length > 0) {
    const catIds = catRows.map(r => r.id);
    const [itemRows] = await pool.execute<TripChecklistItemRow[]>(
      `SELECT * FROM checklist_trip_items
       WHERE checklist_trip_category_id IN (${placeholders(catIds.length)})
       ORDER BY checklist_trip_category_id, sort_order, id`,
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

  const categories: ChecklistCategory[] = catRows.map(row => ({
    id: row.id,
    name: row.name,
    items: itemsByCatId.get(row.id) ?? [],
  }));

  const occIds = occRows.map(r => r.id);
  const checksByOccId = await fetchChecksByOccasionIds(occIds);
  const specChecksByOccId = await fetchSpecChecksByOccasionIds(occIds);

  const occasions: ChecklistOccasion[] = occRows.map(row => ({
    id: row.id,
    name: row.name,
    checks: checksByOccId.get(row.id) ?? {},
    specChecks: specChecksByOccId.get(row.id) ?? {},
  }));

  return { tripId, categories, occasions };
}
