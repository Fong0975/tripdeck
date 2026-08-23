import pool from '../../config/database';
import { deleteImageFromDisk } from '../../middleware/upload';
import type { ImageResponse } from '../../types/trip';
import * as imageRepo from '../imageRepository';

import { TripConnectionAdjacencyRow } from './shared';

/**
 * Updates sort_order for each attraction in the given day according to the
 * position in orderedIds. IDs not belonging to dayId are silently ignored.
 *
 * Any trip_connections in this day whose from/to attractions are no longer
 * adjacent under the new order are deleted, so a connection that disappears
 * from the UI (which only renders connections between adjacent attractions)
 * doesn't linger as an orphaned row in the database. Their images are
 * removed the same way: the DB rows cascade with the connection, and the
 * physical files are deleted from disk once the transaction commits.
 */
export async function updateOrder(
  dayId: number,
  orderedIds: number[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.execute(
        'UPDATE trip_attractions SET sort_order = ? WHERE id = ? AND trip_day_id = ?',
        [i, orderedIds[i], dayId],
      );
    }

    const position = new Map(orderedIds.map((id, i) => [id, i]));
    const [connectionRows] = await conn.execute<TripConnectionAdjacencyRow[]>(
      'SELECT id, trip_attraction_id_from, trip_attraction_id_to FROM trip_connections WHERE trip_day_id = ?',
      [dayId],
    );
    const staleConnectionIds = connectionRows
      .filter(row => {
        const fromPos = position.get(row.trip_attraction_id_from);
        const toPos = position.get(row.trip_attraction_id_to);
        return (
          fromPos === undefined || toPos === undefined || toPos !== fromPos + 1
        );
      })
      .map(row => row.id);

    // Fetched before the delete (whose cascade would otherwise silently wipe
    // these rows) so the physical files can still be cleaned up afterwards.
    const staleImages =
      staleConnectionIds.length > 0
        ? await imageRepo.getConnectionImagesBatch(staleConnectionIds)
        : new Map<number, ImageResponse[]>();

    if (staleConnectionIds.length > 0) {
      await conn.query('DELETE FROM trip_connections WHERE id IN (?)', [
        staleConnectionIds,
      ]);
    }

    await conn.commit();

    // Only delete the physical files once the transaction has actually
    // committed, so a rollback never leaves an in-use image deleted from disk.
    for (const images of staleImages.values()) {
      for (const img of images) {
        deleteImageFromDisk(img.filename);
      }
    }
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
