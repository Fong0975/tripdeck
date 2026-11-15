import type { PoolConnection } from 'mysql2/promise';

import { getDatesInRange, toDateString } from './helpers';
import { deleteTripDaysWithContents } from './tripDayCleanup';
import type { TripDayRow } from './types';

/** The `trip_days` changes needed to fit a trip into a new date range. */
export interface TripDayPlan {
  /** Ids of existing days whose date falls outside the new range. */
  dayIdsToRemove: number[];
  /** `YYYY-MM-DD` dates in the new range that have no trip_day yet. */
  datesToAdd: string[];
}

/**
 * Works out which trip days must be removed and which dates must be added so
 * that the trip's days exactly cover `newStart`..`newEnd`.
 *
 * @param existingDays - The trip's current trip_days rows, ordered by date.
 * @param newStart - First date of the new range, `YYYY-MM-DD`.
 * @param newEnd - Last date of the new range, `YYYY-MM-DD`.
 * @returns The days to remove (in `existingDays` order) and the dates to add
 *   (in ascending date order).
 */
export function planTripDayChanges(
  existingDays: TripDayRow[],
  newStart: string,
  newEnd: string,
): TripDayPlan {
  const newDateSet = new Set(getDatesInRange(newStart, newEnd));
  const existingDateSet = new Set(existingDays.map(d => toDateString(d.date)));
  return {
    dayIdsToRemove: existingDays
      .filter(d => !newDateSet.has(toDateString(d.date)))
      .map(d => d.id),
    datesToAdd: [...newDateSet].filter(d => !existingDateSet.has(d)),
  };
}

/**
 * Applies a {@link TripDayPlan} to a trip inside the caller's transaction:
 * removes the obsolete days (with all of their contents), inserts the new
 * ones, and renumbers every remaining day sequentially by date.
 *
 * Image files are not unlinked here; the caller must do that with the
 * returned filenames only after the transaction commits.
 *
 * @param conn - Connection with an open transaction.
 * @param tripId - Trip whose days are reconciled.
 * @param plan - Days to remove and dates to add.
 * @returns Filenames of every image whose row was removed.
 */
export async function reconcileTripDays(
  conn: PoolConnection,
  tripId: number,
  plan: TripDayPlan,
): Promise<string[]> {
  const filenames = await deleteTripDaysWithContents(conn, plan.dayIdsToRemove);

  // Placeholder `day` values are negative so they can never collide with
  // the existing positive values while both are briefly present.
  for (let i = 0; i < plan.datesToAdd.length; i++) {
    await conn.execute(
      'INSERT INTO trip_days (trip_id, day, date) VALUES (?, ?, ?)',
      [tripId, -(i + 1), plan.datesToAdd[i]],
    );
  }

  await renumberTripDays(conn, tripId);
  return filenames;
}

/**
 * Renumbers every day of a trip sequentially (1..n) by date. Bumping
 * everything out of range first avoids collisions with the unique
 * (trip_id, day) key while days shift (e.g. removing the first day requires
 * every later day to move down by one).
 */
async function renumberTripDays(
  conn: PoolConnection,
  tripId: number,
): Promise<void> {
  await conn.execute(
    'UPDATE trip_days SET day = day + 100000 WHERE trip_id = ?',
    [tripId],
  );
  const [rows] = await conn.query<TripDayRow[]>(
    'SELECT id FROM trip_days WHERE trip_id = ? ORDER BY date',
    [tripId],
  );
  for (let i = 0; i < rows.length; i++) {
    await conn.execute('UPDATE trip_days SET day = ? WHERE id = ?', [
      i + 1,
      rows[i].id,
    ]);
  }
}
