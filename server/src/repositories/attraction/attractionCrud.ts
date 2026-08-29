import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../middleware/upload';
import type {
  AttractionResponse,
  CreateAttractionBody,
  UpdateAttractionBody,
} from '../../types/trip';
import * as connectionRepo from '../connectionRepository';
import * as imageRepo from '../imageRepository';

const logger = createLogger('attraction');

import {
  getWebsites,
  toAttractionResponse,
  TripAttractionRow,
  TripConnectionIdRow,
} from './shared';

/** Returns the trip_day_id for a given attraction. */
export async function getDayIdForAttraction(
  attractionId: number,
): Promise<number> {
  const [rows] = await pool.execute<TripAttractionRow[]>(
    'SELECT trip_day_id FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (rows.length === 0) {
    logger.warn('Attraction not found', { attractionId });
    throw new Error('Attraction not found');
  }
  return rows[0].trip_day_id;
}

/** Confirms an attraction is reachable through the given trip's days. */
export async function verifyBelongsToTrip(
  attractionId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ta.id FROM trip_attractions ta
     JOIN trip_days td ON td.id = ta.trip_day_id
     WHERE ta.id = ? AND td.trip_id = ?`,
    [attractionId, tripId],
  );
  return rows.length > 0;
}

/**
 * Appends an attraction to the given day.
 * sort_order is set to the current count of attractions in that day so the new item appears last.
 */
export async function create(
  dayId: number,
  data: CreateAttractionBody,
): Promise<AttractionResponse> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [countRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM trip_attractions WHERE trip_day_id = ?',
      [dayId],
    );
    const sortOrder = (countRows[0] as { count: number }).count;

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

    const websites = data.referenceWebsites ?? [];
    for (const site of websites) {
      await conn.execute(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [attractionId, site.url, site.title],
      );
    }

    await conn.commit();
    logger.info('Attraction created', { attractionId, dayId });

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
    };
  } catch (err) {
    await conn.rollback();
    logger.error(
      'Failed to create attraction, rolled back',
      { dayId, name: data.name },
      err,
    );
    throw err;
  } finally {
    conn.release();
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE trip_attractions
       SET name = ?, google_map_url = ?, notes = ?, nearby_attractions = ?,
           start_time = ?, end_time = ?
       WHERE id = ?`,
      [
        data.name ?? cur.name,
        'googleMapUrl' in data
          ? (data.googleMapUrl ?? null)
          : cur.google_map_url,
        'notes' in data ? (data.notes ?? null) : cur.notes,
        'nearbyAttractions' in data
          ? (data.nearbyAttractions ?? null)
          : cur.nearby_attractions,
        'startTime' in data ? (data.startTime ?? null) : cur.start_time,
        'endTime' in data ? (data.endTime ?? null) : cur.end_time,
        attractionId,
      ],
    );

    if ('referenceWebsites' in data && Array.isArray(data.referenceWebsites)) {
      await conn.execute(
        'DELETE FROM trip_attraction_websites WHERE trip_attraction_id = ?',
        [attractionId],
      );
      for (const site of data.referenceWebsites) {
        await conn.execute(
          'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
          [attractionId, site.url, site.title],
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    logger.error(
      'Failed to update attraction, rolled back',
      { attractionId, fields: Object.keys(data) },
      err,
    );
    throw err;
  } finally {
    conn.release();
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
    logger.info('Attraction deleted', {
      attractionId,
      connectionsDeleted: connectionRows.length,
      imagesDeleted: images.length,
    });
  }
  return result.affectedRows > 0;
}
