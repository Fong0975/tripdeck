import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../middleware/upload';
import { placeholders } from '../../utils/sql';
import { withTransaction } from '../../utils/withTransaction';
import * as imageRepo from '../imageRepository';

import { TripConnectionAdjacencyRow } from './shared';

const logger = createLogger('attraction');

interface AttractionDayRow extends RowDataPacket {
  trip_day_id: number;
}

interface IdRow extends RowDataPacket {
  id: number;
}

/** Outcome of {@link moveToDay}. */
export type MoveToDayResult =
  'moved' | 'attraction_not_found' | 'day_not_found';

/**
 * Outcome of {@link updateOrder}: `invalid_order` when orderedIds is not
 * exactly a permutation of the day's attraction ids.
 */
export type UpdateOrderResult = 'reordered' | 'invalid_order';

/** Stale connections removed inside a transaction, plus their image files. */
interface StaleConnectionCleanup {
  connectionsRemoved: number;
  imageFilenames: string[];
}

/** A transaction's result plus the image files to unlink after it commits. */
interface OrderOutcome<R> {
  result: R;
  cleanup: StaleConnectionCleanup;
}

type MoveOutcome = OrderOutcome<MoveToDayResult>;
type ReorderOutcome = OrderOutcome<UpdateOrderResult>;

/** Returns a fresh cleanup record describing that nothing was removed. */
function emptyCleanup(): StaleConnectionCleanup {
  return { connectionsRemoved: 0, imageFilenames: [] };
}

/**
 * Writes sort_order 0..n-1 for the given attraction ids within one day in a
 * single `UPDATE ... CASE` statement. IDs not belonging to dayId are ignored
 * by the WHERE clause.
 */
async function writeSortOrder(
  conn: PoolConnection,
  dayId: number,
  orderedIds: readonly number[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  const cases = orderedIds.map(() => 'WHEN ? THEN ?').join(' ');
  const caseParams = orderedIds.flatMap((id, i) => [id, i]);
  await conn.execute(
    `UPDATE trip_attractions SET sort_order = CASE id ${cases} END WHERE trip_day_id = ? AND id IN (${placeholders(orderedIds.length)})`,
    [...caseParams, dayId, ...orderedIds],
  );
}

/**
 * Checks that `orderedIds` is exactly a permutation of `currentIds`: same
 * size, no duplicates, every entry a positive safe integer present in the day.
 *
 * @param orderedIds - Order requested by the client.
 * @param currentIds - The day's attraction ids as stored.
 * @returns True when the requested order covers every attraction exactly once.
 */
function isPermutationOf(
  orderedIds: readonly unknown[],
  currentIds: readonly number[],
): orderedIds is readonly number[] {
  if (orderedIds.length !== currentIds.length) {
    return false;
  }
  const current = new Set(currentIds);
  const seen = new Set<number>();
  for (const id of orderedIds) {
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !current.has(id) ||
      seen.has(id)
    ) {
      return false;
    }
    seen.add(id);
  }
  return true;
}

/**
 * Deletes every trip_connection in dayId whose from/to attractions are not
 * adjacent under orderedIds (including connections whose endpoint is no
 * longer in the day at all).
 *
 * The UI only renders connections between adjacent attractions, so a
 * non-adjacent connection would otherwise linger as an orphaned row. Image
 * rows cascade with the connection; their filenames are returned so the
 * caller can delete the physical files once the transaction has committed.
 *
 * @param conn - Transaction connection.
 * @param dayId - Day whose connections are checked.
 * @param orderedIds - The day's attraction ids in their final order.
 * @returns Number of connections removed and the image filenames to unlink.
 */
async function removeStaleConnections(
  conn: PoolConnection,
  dayId: number,
  orderedIds: readonly number[],
): Promise<StaleConnectionCleanup> {
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

  if (staleConnectionIds.length === 0) {
    return { connectionsRemoved: 0, imageFilenames: [] };
  }

  logger.debug('Detected stale connections', {
    dayId,
    staleConnectionCount: staleConnectionIds.length,
  });

  // Fetched before the delete (whose cascade would otherwise silently wipe
  // these rows) so the physical files can still be cleaned up afterwards.
  const staleImages =
    await imageRepo.getConnectionImagesBatch(staleConnectionIds);
  await conn.query('DELETE FROM trip_connections WHERE id IN (?)', [
    staleConnectionIds,
  ]);

  const imageFilenames: string[] = [];
  for (const images of staleImages.values()) {
    for (const img of images) {
      imageFilenames.push(img.filename);
    }
  }
  return { connectionsRemoved: staleConnectionIds.length, imageFilenames };
}

/**
 * Deletes image files from disk. Must only be called after the transaction
 * that removed their rows has committed, so a rollback never leaves an
 * in-use image deleted from disk.
 */
function deleteImagesFromDisk(filenames: string[]): void {
  for (const filename of filenames) {
    deleteImageFromDisk(filename);
  }
}

/** Returns the attraction ids of a day in display order, locking the rows. */
async function lockDayOrder(
  conn: PoolConnection,
  dayId: number,
): Promise<number[]> {
  const [rows] = await conn.execute<IdRow[]>(
    'SELECT id FROM trip_attractions WHERE trip_day_id = ? ORDER BY sort_order, id FOR UPDATE',
    [dayId],
  );
  return rows.map(row => row.id);
}

/**
 * Updates sort_order for every attraction in the given day according to its
 * position in orderedIds.
 *
 * orderedIds must list each of the day's attractions exactly once (checked
 * inside the transaction against the locked rows); otherwise nothing changes
 * and `invalid_order` is returned, so a partial or stale list can never
 * leave attractions with outdated orders or drop their connections.
 *
 * Any trip_connections in this day whose from/to attractions are no longer
 * adjacent under the new order are deleted, together with their images (DB
 * rows cascade; physical files are deleted once the transaction commits).
 *
 * @param dayId - Day whose attractions are reordered.
 * @param orderedIds - Every attraction id of the day, in the desired order.
 * @returns `reordered` on success, `invalid_order` when orderedIds is not a
 *   permutation of the day's attraction ids.
 */
export async function updateOrder(
  dayId: number,
  orderedIds: readonly unknown[],
): Promise<UpdateOrderResult> {
  let outcome: ReorderOutcome;
  try {
    outcome = await withTransaction<ReorderOutcome>(async conn => {
      const currentIds = await lockDayOrder(conn, dayId);
      if (!isPermutationOf(orderedIds, currentIds)) {
        return { result: 'invalid_order', cleanup: emptyCleanup() };
      }
      await writeSortOrder(conn, dayId, orderedIds);
      return {
        result: 'reordered',
        cleanup: await removeStaleConnections(conn, dayId, orderedIds),
      };
    });
  } catch (err) {
    logger.error(
      'Failed to reorder attractions, rolled back',
      { dayId, orderedIdsCount: orderedIds.length },
      err,
    );
    throw err;
  }

  const { result, cleanup } = outcome;
  deleteImagesFromDisk(cleanup.imageFilenames);
  if (result === 'reordered') {
    logger.debug('Attractions reordered', {
      dayId,
      reordered: orderedIds.length,
      connectionsRemoved: cleanup.connectionsRemoved,
      imagesRemoved: cleanup.imageFilenames.length,
    });
  }
  return result;
}

/**
 * Moves an attraction to `targetIndex` (0-based, clamped to the valid range)
 * within `targetDayId`, atomically.
 *
 * The attraction keeps its id, so its images, websites, times and resolved
 * geo stay attached. Both the source and the target day are renumbered, and
 * any connection in either day whose endpoints are no longer adjacent
 * (including every connection touching the moved attraction in its old day)
 * is deleted along with its image files.
 *
 * When the target day is the attraction's current day the call behaves as a
 * reorder within that day.
 *
 * @param tripId - Trip the attraction and target day must both belong to.
 * @param attractionId - Attraction to move.
 * @param targetDayId - Day to move the attraction into.
 * @param targetIndex - Desired position in the target day.
 * @returns 'moved' on success, or which ownership check failed.
 */
export async function moveToDay(
  tripId: number,
  attractionId: number,
  targetDayId: number,
  targetIndex: number,
): Promise<MoveToDayResult> {
  let outcome: MoveOutcome;
  try {
    outcome = await withTransaction<MoveOutcome>(async conn => {
      const [attractionRows] = await conn.execute<AttractionDayRow[]>(
        `SELECT ta.trip_day_id FROM trip_attractions ta
         JOIN trip_days td ON td.id = ta.trip_day_id
         WHERE ta.id = ? AND td.trip_id = ? FOR UPDATE`,
        [attractionId, tripId],
      );
      if (attractionRows.length === 0) {
        return { result: 'attraction_not_found', cleanup: emptyCleanup() };
      }
      const sourceDayId = attractionRows[0].trip_day_id;

      const [dayRows] = await conn.execute<IdRow[]>(
        'SELECT id FROM trip_days WHERE id = ? AND trip_id = ? FOR UPDATE',
        [targetDayId, tripId],
      );
      if (dayRows.length === 0) {
        return { result: 'day_not_found', cleanup: emptyCleanup() };
      }

      const sameDay = sourceDayId === targetDayId;
      const sourceIds = (await lockDayOrder(conn, sourceDayId)).filter(
        id => id !== attractionId,
      );
      const targetIds = sameDay
        ? sourceIds
        : await lockDayOrder(conn, targetDayId);
      const insertAt = Math.max(0, Math.min(targetIndex, targetIds.length));
      const newTargetIds = [
        ...targetIds.slice(0, insertAt),
        attractionId,
        ...targetIds.slice(insertAt),
      ];

      const affectedDays: Array<[dayId: number, orderedIds: number[]]> = [
        [targetDayId, newTargetIds],
      ];
      if (!sameDay) {
        await conn.execute(
          'UPDATE trip_attractions SET trip_day_id = ? WHERE id = ?',
          [targetDayId, attractionId],
        );
        affectedDays.unshift([sourceDayId, sourceIds]);
      }

      const cleanup = emptyCleanup();
      for (const [dayId, orderedIds] of affectedDays) {
        await writeSortOrder(conn, dayId, orderedIds);
        const removed = await removeStaleConnections(conn, dayId, orderedIds);
        cleanup.connectionsRemoved += removed.connectionsRemoved;
        cleanup.imageFilenames.push(...removed.imageFilenames);
      }
      return { result: 'moved', cleanup };
    });
  } catch (err) {
    logger.error(
      'Failed to move attraction, rolled back',
      { tripId, attractionId, targetDayId, targetIndex },
      err,
    );
    throw err;
  }

  deleteImagesFromDisk(outcome.cleanup.imageFilenames);
  if (outcome.result === 'moved') {
    logger.info('Attraction moved', {
      tripId,
      attractionId,
      targetDayId,
      targetIndex,
      connectionsRemoved: outcome.cleanup.connectionsRemoved,
      imagesRemoved: outcome.cleanup.imageFilenames.length,
    });
  }
  return outcome.result;
}
