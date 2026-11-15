import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

/** Day-scoped child tables whose rows carry a per-day `sort_order`. */
export type DayOrderedTable = 'trip_attractions' | 'trip_day_locations';

/**
 * Fixed SQL per table so no identifier is ever interpolated into a query.
 * MAX + 1 (rather than COUNT) stays collision-free after a row is deleted
 * from the middle of the day.
 */
const NEXT_SORT_ORDER_SQL: Record<DayOrderedTable, string> = {
  trip_attractions:
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM trip_attractions WHERE trip_day_id = ?',
  trip_day_locations:
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM trip_day_locations WHERE trip_day_id = ?',
};

interface NextOrderRow extends RowDataPacket {
  next_order: number | string;
}

/**
 * Returns the sort_order a row appended to a day should get, serialising
 * concurrent appends to the same day.
 *
 * The parent trip_days row is locked first (`FOR UPDATE`), so a second
 * transaction appending to the same day waits until this one commits and
 * then sees its row in the MAX.
 *
 * @param conn - Transaction connection; the lock is held until it ends.
 * @param table - Child table to compute the next order for.
 * @param dayId - Day the new row is appended to.
 * @returns One past the day's highest sort_order, or 0 for an empty day.
 */
export async function nextSortOrderInDay(
  conn: PoolConnection,
  table: DayOrderedTable,
  dayId: number,
): Promise<number> {
  await conn.execute('SELECT id FROM trip_days WHERE id = ? FOR UPDATE', [
    dayId,
  ]);
  const [rows] = await conn.execute<NextOrderRow[]>(
    NEXT_SORT_ORDER_SQL[table],
    [dayId],
  );
  return Number(rows[0]?.next_order ?? 0);
}
