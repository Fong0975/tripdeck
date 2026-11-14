import type { ResultSetHeader } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../middleware/upload';
import type {
  AttractionResponse,
  CreateAttractionBody,
  UpdateAttractionBody,
} from '../../types/trip';
import { withTransaction } from '../../utils/withTransaction';
import * as connectionRepo from '../connectionRepository';
import * as imageRepo from '../imageRepository';

import {
  countAttractionsInDay,
  getWebsites,
  insertWebsites,
  toAttractionResponse,
  TripAttractionRow,
  TripConnectionIdRow,
} from './shared';

const logger = createLogger('attraction');

/**
 * Appends an attraction to the given day.
 * sort_order is set to the current count of attractions in that day so the new item appears last.
 *
 * @param dayId - Day to append to.
 * @param data - New attraction fields.
 * @returns The created attraction (without images or coordinates).
 */
export async function create(
  dayId: number,
  data: CreateAttractionBody,
): Promise<AttractionResponse> {
  const websites = data.referenceWebsites ?? [];
  try {
    return await withTransaction(async conn => {
      const sortOrder = await countAttractionsInDay(conn, dayId);

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO trip_attractions
           (trip_day_id, name, google_map_url, notes, nearby_attractions, start_time, end_time, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dayId,
          data.name,
          data.googleMapUrl ?? null,
          data.notes ?? null,
          data.nearbyAttractions ?? null,
          data.startTime ?? null,
          data.endTime ?? null,
          sortOrder,
        ],
      );
      const attractionId = result.insertId;
      await insertWebsites(conn, attractionId, websites);

      return {
        id: attractionId,
        name: data.name,
        googleMapUrl: data.googleMapUrl ?? null,
        notes: data.notes ?? null,
        nearbyAttractions: data.nearbyAttractions ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        referenceWebsites: websites,
        images: [],
        sortOrder,
        latitude: null,
        longitude: null,
        geoSource: null,
      };
    });
  } catch (err) {
    logger.error(
      'Failed to create attraction, rolled back',
      { dayId, name: data.name },
      err,
    );
    throw err;
  }
}

/**
 * Performs a partial update. Only fields present in data are changed.
 * When referenceWebsites is provided, the old set is replaced entirely.
 */
export async function update(
  attractionId: number,
  data: UpdateAttractionBody,
): Promise<AttractionResponse | null> {
  const [rows] = await pool.execute<TripAttractionRow[]>(
    'SELECT * FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (rows.length === 0) {
    logger.warn('Cannot update attraction: not found', { attractionId });
    return null;
  }

  const cur = rows[0];
  try {
    await withTransaction(async conn => {
      const nextName = data.name ?? cur.name;
      const nextGoogleMapUrl =
        'googleMapUrl' in data
          ? (data.googleMapUrl ?? null)
          : cur.google_map_url;

      await conn.execute(
        `UPDATE trip_attractions
         SET name = ?, google_map_url = ?, notes = ?, nearby_attractions = ?,
             start_time = ?, end_time = ?
         WHERE id = ?`,
        [
          nextName,
          nextGoogleMapUrl,
          'notes' in data ? (data.notes ?? null) : cur.notes,
          'nearbyAttractions' in data
            ? (data.nearbyAttractions ?? null)
            : cur.nearby_attractions,
          'startTime' in data ? (data.startTime ?? null) : cur.start_time,
          'endTime' in data ? (data.endTime ?? null) : cur.end_time,
          attractionId,
        ],
      );

      if (nextName !== cur.name || nextGoogleMapUrl !== cur.google_map_url) {
        await conn.execute(
          `UPDATE trip_attractions
           SET latitude = NULL, longitude = NULL, geo_source = NULL, geo_key = NULL
           WHERE id = ?`,
          [attractionId],
        );
      }

      if (
        'referenceWebsites' in data &&
        Array.isArray(data.referenceWebsites)
      ) {
        await conn.execute(
          'DELETE FROM trip_attraction_websites WHERE trip_attraction_id = ?',
          [attractionId],
        );
        await insertWebsites(conn, attractionId, data.referenceWebsites);
      }
    });
  } catch (err) {
    logger.error(
      'Failed to update attraction, rolled back',
      { attractionId, fields: Object.keys(data) },
      err,
    );
    throw err;
  }

  const [updatedRows] = await pool.execute<TripAttractionRow[]>(
    'SELECT * FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  const [websites, images] = await Promise.all([
    getWebsites(attractionId),
    imageRepo.getAttractionImages(attractionId),
  ]);
  return toAttractionResponse(updatedRows[0], websites, images);
}

/**
 * Deletes an attraction. Any trip_connections referencing it as either
 * endpoint are deleted first (via connectionRepository, which also cleans up
 * their images) since the trip_connections foreign keys have no ON DELETE
 * clause and would otherwise reject the delete with a constraint violation.
 */
export async function deleteById(attractionId: number): Promise<boolean> {
  const [connectionRows] = await pool.execute<TripConnectionIdRow[]>(
    'SELECT id FROM trip_connections WHERE trip_attraction_id_from = ? OR trip_attraction_id_to = ?',
    [attractionId, attractionId],
  );
  for (const row of connectionRows) {
    await connectionRepo.deleteById(row.id);
  }

  const images = await imageRepo.getAttractionImages(attractionId);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (result.affectedRows > 0) {
    for (const img of images) {
      deleteImageFromDisk(img.filename);
    }
    logger.debug('Attraction deleted', {
      attractionId,
      connectionsDeleted: connectionRows.length,
      imagesDeleted: images.length,
    });
  }
  return result.affectedRows > 0;
}
