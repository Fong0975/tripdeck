import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { placeholders } from '../../utils/sql';

interface ImageFilenameRow extends RowDataPacket {
  filename: string;
}

/**
 * Deletes the given trip days and everything that hangs off them, using only
 * `conn` so the whole cleanup is part of the caller's transaction:
 *  - every trip_connections row on those days, or touching an attraction on
 *    those days (their trip_connection_images rows cascade);
 *  - every trip_attractions row on those days (their websites and
 *    trip_attraction_images rows cascade);
 *  - the trip_days rows themselves (trip_day_images and trip_day_locations
 *    rows cascade).
 *
 * Connections must go first because their attraction foreign keys have no
 * ON DELETE clause and would otherwise reject the attraction delete.
 *
 * Image files on disk are deliberately not touched here: the caller must
 * unlink the returned filenames only after the transaction commits, so a
 * rollback never leaves rows pointing at missing files.
 *
 * @param conn - Connection with an open transaction.
 * @param dayIds - trip_days ids to remove.
 * @returns Filenames of every image whose row was removed.
 */
export async function deleteTripDaysWithContents(
  conn: PoolConnection,
  dayIds: number[],
): Promise<string[]> {
  if (dayIds.length === 0) {
    return [];
  }

  const ph = placeholders(dayIds.length);
  const attractionIdsSql = `SELECT id FROM trip_attractions WHERE trip_day_id IN (${ph})`;
  const connectionFilterSql = `trip_day_id IN (${ph})
       OR trip_attraction_id_from IN (${attractionIdsSql})
       OR trip_attraction_id_to IN (${attractionIdsSql})`;
  const connectionFilterParams = [...dayIds, ...dayIds, ...dayIds];

  const [imageRows] = await conn.execute<ImageFilenameRow[]>(
    `SELECT filename FROM trip_day_images WHERE trip_day_id IN (${ph})
     UNION ALL
     SELECT filename FROM trip_attraction_images
       WHERE trip_attraction_id IN (${attractionIdsSql})
     UNION ALL
     SELECT filename FROM trip_connection_images
       WHERE trip_connection_id IN (
         SELECT id FROM trip_connections WHERE ${connectionFilterSql}
       )`,
    [...dayIds, ...dayIds, ...connectionFilterParams],
  );

  await conn.execute(
    `DELETE FROM trip_connections WHERE ${connectionFilterSql}`,
    connectionFilterParams,
  );
  await conn.execute(
    `DELETE FROM trip_attractions WHERE trip_day_id IN (${ph})`,
    dayIds,
  );
  await conn.execute(`DELETE FROM trip_days WHERE id IN (${ph})`, dayIds);

  return imageRows.map(row => row.filename);
}
