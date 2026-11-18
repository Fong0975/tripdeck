import type { ChecklistSpecBody, ItemSpec } from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../../config/database';
import { placeholders } from '../../../utils/sql';

/**
 * A row of an item-spec table. The parent-item foreign key column differs per
 * table and is read through the `RowDataPacket` index signature.
 */
export interface ItemSpecRow extends RowDataPacket {
  id: number;
  name: string;
  storage_location: string | null;
}

/** Table layout of one item-spec table and its parent item table. */
export interface SpecTableConfig {
  /** Table holding the specs, e.g. `checklist_template_item_specs`. */
  specTable: string;
  /** Table holding the parent items, e.g. `checklist_template_items`. */
  itemTable: string;
  /** Foreign key column in `specTable` that references `itemTable.id`. */
  parentColumn: string;
}

/** Spec CRUD operations bound to one spec table. */
export interface SpecRepository {
  /** Loads every spec of the given items, grouped by item id. */
  fetchByItemIds(itemIds: number[]): Promise<Map<number, ItemSpec[]>>;
  /**
   * Inserts a spec; resolves to null when the parent item does not exist. An
   * item with specs holds no storage location of its own, so the item's
   * location is cleared.
   */
  create(itemId: number, data: ChecklistSpecBody): Promise<ItemSpec | null>;
  /** Updates a spec; resolves to null when the spec does not exist. */
  update(specId: number, data: ChecklistSpecBody): Promise<ItemSpec | null>;
  /** Deletes a spec; resolves to true when a row was removed. */
  remove(specId: number): Promise<boolean>;
  /** Resolves to true when the spec exists and belongs to the item. */
  belongsToItem(specId: number, itemId: number): Promise<boolean>;
}

/**
 * Maps a spec row to its API response shape.
 *
 * @param row - Spec row from any item-spec table.
 * @returns The spec response.
 */
export function toSpecResponse(row: ItemSpecRow): ItemSpec {
  return {
    id: row.id,
    name: row.name,
    storage_location: row.storage_location,
  };
}

/**
 * Creates the spec repository for one item-spec table. Template and trip
 * checklists store specs in structurally identical tables, so the SQL is
 * shared and only the table/column names vary.
 *
 * @param config - Spec table, parent item table and foreign key column. These
 *   are interpolated into SQL and must be trusted constants, never user input.
 * @returns Spec operations bound to that table.
 */
export function createSpecRepository({
  specTable,
  itemTable,
  parentColumn,
}: SpecTableConfig): SpecRepository {
  return {
    async fetchByItemIds(itemIds) {
      const map = new Map<number, ItemSpec[]>();
      if (itemIds.length === 0) {
        return map;
      }
      const [rows] = await pool.execute<ItemSpecRow[]>(
        `SELECT * FROM ${specTable}
         WHERE ${parentColumn} IN (${placeholders(itemIds.length)})
         ORDER BY ${parentColumn}, id`,
        itemIds,
      );
      for (const row of rows) {
        const itemId = row[parentColumn] as number;
        const list = map.get(itemId) ?? [];
        list.push(toSpecResponse(row));
        map.set(itemId, list);
      }
      return map;
    },

    async create(itemId, data) {
      const [itemRows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM ${itemTable} WHERE id = ?`,
        [itemId],
      );
      if (itemRows.length === 0) {
        return null;
      }

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO ${specTable} (${parentColumn}, name, storage_location) VALUES (?, ?, ?)`,
        [itemId, data.name, data.storage_location ?? null],
      );
      await pool.execute(
        `UPDATE ${itemTable} SET storage_location = NULL WHERE id = ?`,
        [itemId],
      );

      return {
        id: result.insertId,
        name: data.name,
        storage_location: data.storage_location ?? null,
      };
    },

    async update(specId, data) {
      const [rows] = await pool.execute<ItemSpecRow[]>(
        `SELECT * FROM ${specTable} WHERE id = ?`,
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
        `UPDATE ${specTable} SET name = ?, storage_location = ? WHERE id = ?`,
        [data.name, storage_location, specId],
      );

      return toSpecResponse({ ...cur, name: data.name, storage_location });
    },

    async remove(specId) {
      const [result] = await pool.execute<ResultSetHeader>(
        `DELETE FROM ${specTable} WHERE id = ?`,
        [specId],
      );
      return result.affectedRows > 0;
    },

    async belongsToItem(specId, itemId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM ${specTable} WHERE id = ? AND ${parentColumn} = ?`,
        [specId, itemId],
      );
      return rows.length > 0;
    },
  };
}
