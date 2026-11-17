import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../../logger';
import { bulkInsert } from '../../../utils/bulkInsert';
import type {
  TemplateCategoryRow,
  TemplateItemRow,
  TemplateItemSpecRow,
} from '../template/shared';

const logger = createLogger('checklist-trip');

/** The whole checklist template, as raw rows grouped by parent id. */
interface TemplateSnapshot {
  categories: TemplateCategoryRow[];
  itemsByCategoryId: Map<number, TemplateItemRow[]>;
  specsByItemId: Map<number, TemplateItemSpecRow[]>;
}

/**
 * Groups `rows` by `keyOf(row)`, preserving the input order within each group.
 *
 * @param rows - Rows to group.
 * @param keyOf - Returns the grouping key of a row.
 * @returns Map of key to the rows carrying it.
 */
function groupBy<T>(rows: T[], keyOf: (row: T) => number): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

/**
 * Loads the entire global template (categories, items, specs) with three
 * queries on the transaction's connection, instead of one query per
 * category and per item. Every template row belongs to the single global
 * template, so no `WHERE` filter is needed.
 *
 * @param conn - Connection with an open transaction.
 * @returns The template rows, in display order within each parent.
 */
async function loadTemplateSnapshot(
  conn: PoolConnection,
): Promise<TemplateSnapshot> {
  const [categories] = await conn.execute<TemplateCategoryRow[]>(
    'SELECT * FROM checklist_template_categories ORDER BY sort_order, id',
  );
  if (categories.length === 0) {
    return {
      categories,
      itemsByCategoryId: new Map(),
      specsByItemId: new Map(),
    };
  }

  const [items] = await conn.execute<TemplateItemRow[]>(
    'SELECT * FROM checklist_template_items ORDER BY checklist_template_category_id, sort_order, id',
  );
  const [specs] = await conn.execute<TemplateItemSpecRow[]>(
    'SELECT * FROM checklist_template_item_specs ORDER BY checklist_template_item_id, id',
  );
  return {
    categories,
    itemsByCategoryId: groupBy(
      items,
      item => item.checklist_template_category_id,
    ),
    specsByItemId: groupBy(specs, spec => spec.checklist_template_item_id),
  };
}

/**
 * Copies every template category, item and spec into the trip's checklist.
 *
 * The template is read once up front. Categories and items are inserted one
 * row at a time because their new IDs are needed by their children; the
 * leaf spec rows are sent as one multi-row insert at the end.
 *
 * @param conn - Connection with an open transaction; all reads and inserts
 *   run on it.
 * @param tripId - Trip receiving the copied categories.
 * @returns The number of categories copied.
 */
export async function copyTemplateIntoTrip(
  conn: PoolConnection,
  tripId: number,
): Promise<number> {
  const template = await loadTemplateSnapshot(conn);
  logger.debug('Copying template into new trip checklist', {
    tripId,
    categoryCount: template.categories.length,
  });

  const specRows: unknown[][] = [];
  for (const [catIndex, cat] of template.categories.entries()) {
    const [catResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)',
      [tripId, cat.name, catIndex],
    );
    const tripCatId = catResult.insertId;

    const catItems = template.itemsByCategoryId.get(cat.id) ?? [];
    for (const [itemIndex, item] of catItems.entries()) {
      const [itemResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [
          tripCatId,
          item.name,
          item.quantity,
          item.notes,
          item.storage_location,
          itemIndex,
        ],
      );
      const tripItemId = itemResult.insertId;

      for (const spec of template.specsByItemId.get(item.id) ?? []) {
        specRows.push([tripItemId, spec.name, spec.storage_location]);
      }
    }
  }

  await bulkInsert(
    conn,
    'checklist_trip_item_specs',
    ['checklist_trip_item_id', 'name', 'storage_location'],
    specRows,
  );
  return template.categories.length;
}
