import type { PoolConnection } from 'mysql2/promise';

import { copyTemplateIntoTrip } from './templateCopy';

/**
 * Inserts the default occasion into a trip's checklist.
 *
 * @param conn - Connection with an open transaction.
 * @param tripId - Trip receiving the occasion.
 */
export async function insertDefaultOccasion(
  conn: PoolConnection,
  tripId: number,
): Promise<void> {
  await conn.execute(
    "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')",
    [tripId],
  );
}

/**
 * Builds a brand-new trip's checklist from the current global template and
 * adds the default occasion.
 *
 * The occasion is added even when the template is empty, because a checklist
 * is considered to exist once the trip has at least one occasion.
 * The caller must guarantee the trip has no checklist rows yet, as this
 * function performs no duplicate check.
 *
 * @param conn - Connection with an open transaction; every statement runs on
 *   it so a failure rolls back together with the caller's work.
 * @param tripId - Newly created trip.
 * @returns The number of template categories copied.
 */
export async function seedTripChecklist(
  conn: PoolConnection,
  tripId: number,
): Promise<number> {
  const categoriesCopied = await copyTemplateIntoTrip(conn, tripId);
  await insertDefaultOccasion(conn, tripId);
  return categoriesCopied;
}
