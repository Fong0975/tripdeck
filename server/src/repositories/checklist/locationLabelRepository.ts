import {
  getEffectiveLocations,
  NO_LOCATION,
  type LocationLabel,
  type OrphanLocation,
} from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../config/database';
import { withTransaction } from '../../utils/withTransaction';

import {
  nextSiblingOrder,
  reorderSiblings,
  type ReorderResult,
} from './shared/siblingOrder';

const LABEL_TABLE = 'checklist_location_labels';

interface LabelRow extends RowDataPacket {
  id: number;
  name: string;
  show_as_group: number;
  sort_order: number;
}

interface LocationRow extends RowDataPacket {
  id: number;
  storage_location: string;
}

interface TripLocationRow extends RowDataPacket {
  trip_id: number;
  storage_location: string;
}

/** Template tables whose rows carry a `storage_location`. */
const TEMPLATE_LOCATION_TABLES = [
  'checklist_template_items',
  'checklist_template_item_specs',
] as const;

function toLabel(row: LabelRow): LocationLabel {
  return {
    id: row.id,
    name: row.name,
    show_as_group: row.show_as_group === 1,
    sort_order: row.sort_order,
  };
}

/** Outcome of {@link createLocationLabel}. */
export type CreateLabelResult =
  { status: 'created'; label: LocationLabel } | { status: 'duplicate' };

/**
 * Lists the defined location labels in display order.
 *
 * @returns Every label, ordered by `sort_order`.
 */
export async function listLocationLabels(): Promise<LocationLabel[]> {
  const [rows] = await pool.execute<LabelRow[]>(
    `SELECT id, name, show_as_group, sort_order FROM ${LABEL_TABLE} ORDER BY sort_order, id`,
  );
  return rows.map(toLabel);
}

/**
 * Looks up one location label.
 *
 * @param id - Label id.
 * @returns The label, or null when it does not exist.
 */
export async function getLocationLabel(
  id: number,
): Promise<LocationLabel | null> {
  const [rows] = await pool.execute<LabelRow[]>(
    `SELECT id, name, show_as_group, sort_order FROM ${LABEL_TABLE} WHERE id = ?`,
    [id],
  );
  return rows[0] ? toLabel(rows[0]) : null;
}

function isDuplicateEntryError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'ER_DUP_ENTRY';
}

/**
 * Appends a location label. Re-creating a deleted label with the same name
 * makes units that still carry that name refer to the new label again.
 *
 * @param name - Validated label name.
 * @param showAsGroup - Whether the label is its own group in the storage view.
 * @returns The created label, or `duplicate` when the name is already defined.
 */
export async function createLocationLabel(
  name: string,
  showAsGroup: boolean,
): Promise<CreateLabelResult> {
  try {
    return await withTransaction<CreateLabelResult>(async conn => {
      const sortOrder = await nextSiblingOrder(conn, LABEL_TABLE, null);
      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO ${LABEL_TABLE} (name, show_as_group, sort_order) VALUES (?, ?, ?)`,
        [name, showAsGroup ? 1 : 0, sortOrder],
      );
      return {
        status: 'created',
        label: {
          id: result.insertId,
          name,
          show_as_group: showAsGroup,
          sort_order: sortOrder,
        },
      };
    });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return { status: 'duplicate' };
    }
    throw err;
  }
}

/**
 * Changes whether a label is listed as a group of its own in the storage view.
 *
 * @param id - Label id.
 * @param showAsGroup - New value.
 * @returns The updated label, or null when it does not exist.
 */
export async function setLocationLabelShowAsGroup(
  id: number,
  showAsGroup: boolean,
): Promise<LocationLabel | null> {
  await pool.execute(
    `UPDATE ${LABEL_TABLE} SET show_as_group = ? WHERE id = ?`,
    [showAsGroup ? 1 : 0, id],
  );
  return getLocationLabel(id);
}

/**
 * Renumbers the labels.
 *
 * @param orderedIds - Every label id, in the desired order.
 * @returns `reordered`, or `invalid_order` when the list is not exactly the
 *   defined labels.
 */
export function reorderLocationLabels(
  orderedIds: readonly unknown[],
): Promise<ReorderResult> {
  return reorderSiblings(LABEL_TABLE, null, orderedIds);
}

/**
 * Removes `name` from the `storage_location` of every row of a template table.
 * Matching is done on the parsed list so names containing spaces or
 * substrings of other names are handled exactly.
 */
async function stripNameFromTemplateTable(
  conn: PoolConnection,
  table: (typeof TEMPLATE_LOCATION_TABLES)[number],
  name: string,
): Promise<void> {
  const [rows] = await conn.execute<LocationRow[]>(
    `SELECT id, storage_location FROM ${table} WHERE LOCATE(?, storage_location) > 0`,
    [name],
  );
  for (const row of rows) {
    const names = getEffectiveLocations(row.storage_location);
    if (!names.includes(name)) {
      continue;
    }
    const remaining = names.filter(location => location !== name).join(',');
    await conn.execute(
      `UPDATE ${table} SET storage_location = ? WHERE id = ?`,
      [remaining === '' ? null : remaining, row.id],
    );
  }
}

/**
 * Deletes a location label and removes its name from the template. Trip
 * checklists are left untouched: their units keep the name and its checks.
 *
 * @param id - Label id.
 * @returns True when the label existed and was deleted.
 */
export function deleteLocationLabel(id: number): Promise<boolean> {
  return withTransaction<boolean>(async conn => {
    const [rows] = await conn.execute<LabelRow[]>(
      `SELECT id, name, show_as_group, sort_order FROM ${LABEL_TABLE} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!rows[0]) {
      return false;
    }
    await conn.execute(`DELETE FROM ${LABEL_TABLE} WHERE id = ?`, [id]);
    for (const table of TEMPLATE_LOCATION_TABLES) {
      await stripNameFromTemplateTable(conn, table, rows[0].name);
    }
    return true;
  });
}

/**
 * Lists the names that trip checklist units are filed under although no
 * label with that name is defined (any more).
 *
 * @param definedNames - Names of the currently defined labels.
 * @returns One entry per undefined name with the number of trips using it,
 *   ordered by name.
 */
export async function listOrphanLocations(
  definedNames: readonly string[],
): Promise<OrphanLocation[]> {
  const [rows] = await pool.execute<TripLocationRow[]>(
    `SELECT c.trip_id, i.storage_location
     FROM checklist_trip_items i
     JOIN checklist_trip_categories c ON c.id = i.checklist_trip_category_id
     WHERE i.storage_location IS NOT NULL AND i.storage_location <> ''
     UNION
     SELECT c.trip_id, s.storage_location
     FROM checklist_trip_item_specs s
     JOIN checklist_trip_items i ON i.id = s.checklist_trip_item_id
     JOIN checklist_trip_categories c ON c.id = i.checklist_trip_category_id
     WHERE s.storage_location IS NOT NULL AND s.storage_location <> ''`,
  );

  const defined = new Set(definedNames);
  const tripsByName = new Map<string, Set<number>>();
  for (const row of rows) {
    for (const name of getEffectiveLocations(row.storage_location)) {
      if (name === NO_LOCATION || defined.has(name)) {
        continue;
      }
      const trips = tripsByName.get(name) ?? new Set<number>();
      trips.add(row.trip_id);
      tripsByName.set(name, trips);
    }
  }
  return [...tripsByName.entries()]
    .map(([name, trips]) => ({ name, trip_count: trips.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Finds a requested location name a unit may not be filed under. A unit may
 * use every defined label plus the names it already carries, so a deleted
 * label can be removed from it but not added again.
 *
 * @param requested - Raw `storage_location` of the write.
 * @param heldLocations - Effective locations the unit currently carries.
 * @returns The first disallowed name, or null when all are allowed.
 */
export async function findDisallowedLocation(
  requested: string | null | undefined,
  heldLocations: readonly string[] = [],
): Promise<string | null> {
  const names = getEffectiveLocations(requested).filter(
    name => name !== NO_LOCATION,
  );
  if (names.length === 0) {
    return null;
  }
  const labels = await listLocationLabels();
  const allowed = new Set([
    ...labels.map(label => label.name),
    ...heldLocations,
  ]);
  return names.find(name => !allowed.has(name)) ?? null;
}
