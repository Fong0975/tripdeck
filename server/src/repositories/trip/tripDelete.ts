import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../storage/imageFiles';
import * as connectionRepo from '../connection';
import * as imageRepo from '../image';

const logger = createLogger('trip');

interface IdRow extends RowDataPacket {
  id: number;
}

/**
 * Selects the `id` column of every row returned by `sql` for the given trip.
 *
 * @param sql - Query selecting a single `id` column, with one `?` for the trip id.
 * @param tripId - Trip to scope the query to.
 * @returns The matching ids, in query order.
 */
async function selectIds(sql: string, tripId: number): Promise<number[]> {
  const [rows] = await pool.execute<IdRow[]>(sql, [tripId]);
  return rows.map(row => row.id);
}

/**
 * Collects the filenames of every image owned by a trip: the trip's own
 * images, then each day's, then each attraction's. Connection images are not
 * included because connections are deleted (with their files) separately.
 *
 * @param tripId - Trip whose own images are collected.
 * @param dayIds - Ids of the trip's days.
 * @param attractionIds - Ids of the trip's attractions.
 * @returns Every image filename, trip images first.
 */
async function collectTripImageFilenames(
  tripId: number,
  dayIds: number[],
  attractionIds: number[],
): Promise<string[]> {
  const [images, dayImagesByDay, attractionImagesByAttraction] =
    await Promise.all([
      imageRepo.getTripImages(tripId),
      imageRepo.getDayImagesBatch(dayIds),
      imageRepo.getAttractionImagesBatch(attractionIds),
    ]);
  return [
    ...images,
    ...[...dayImagesByDay.values()].flat(),
    ...[...attractionImagesByAttraction.values()].flat(),
  ].map(img => img.filename);
}

/**
 * Deletes a trip and every image file it owns — its own, plus every day's,
 * attraction's, and connection's — from disk. `ON DELETE CASCADE` removes
 * all the corresponding DB rows automatically, but the uploaded files
 * themselves are never touched by that cascade and must be cleaned up
 * explicitly (same tradeoff as connectionRepository.deleteById).
 *
 * Every trip_connections row under this trip is deleted explicitly first
 * (via connectionRepo.deleteById, which also cleans up its own images) since
 * the trip_attraction_id_from/to foreign keys have no ON DELETE clause;
 * without this, MySQL's cascade from trips -> trip_days -> trip_attractions
 * would hit those constraints and reject the whole delete (same issue
 * attractionCrud.deleteById works around for a single attraction).
 *
 * @param id - Trip to delete.
 * @returns True when the trip row existed and was deleted.
 */
export async function deleteById(id: number): Promise<boolean> {
  const dayIds = await selectIds(
    'SELECT id FROM trip_days WHERE trip_id = ?',
    id,
  );
  const attractionIds = await selectIds(
    `SELECT ta.id FROM trip_attractions ta
     JOIN trip_days td ON td.id = ta.trip_day_id
     WHERE td.trip_id = ?`,
    id,
  );
  const connectionIds = await selectIds(
    `SELECT tc.id FROM trip_connections tc
     JOIN trip_days td ON td.id = tc.trip_day_id
     WHERE td.trip_id = ?`,
    id,
  );
  for (const connectionId of connectionIds) {
    await connectionRepo.deleteById(connectionId);
  }

  const filenames = await collectTripImageFilenames(id, dayIds, attractionIds);

  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trips WHERE id = ?',
    [id],
  );
  if (result.affectedRows > 0) {
    for (const filename of filenames) {
      deleteImageFromDisk(filename);
    }
    logger.debug('Trip deleted', {
      tripId: id,
      connectionsDeleted: connectionIds.length,
      imagesDeleted: filenames.length,
    });
  }
  return result.affectedRows > 0;
}
