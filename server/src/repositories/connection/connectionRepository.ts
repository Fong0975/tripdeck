import type {
  CreateConnectionBody,
  TravelConnection,
  UpdateConnectionBody,
  UploadedImage,
} from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../storage/imageFiles';
import { isTransportMode } from '../../validation/transportMode';
import * as imageRepo from '../image';

const logger = createLogger('connection');

// --- Row type ---

/** A raw `trip_connections` row. */
export interface TripConnectionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  trip_attraction_id_from: number;
  trip_attraction_id_to: number;
  transport_mode: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
}

// --- Helper ---

/**
 * Maps a `trip_connections` row to its API response shape.
 *
 * @param row - Raw connection row.
 * @param images - Images attached to the connection.
 * @returns The connection response; an unknown stored `transport_mode`
 *   (legacy or hand-edited data) is reported as null.
 */
export function toConnectionResponse(
  row: TripConnectionRow,
  images: UploadedImage[] = [],
): TravelConnection {
  return {
    id: row.id,
    fromAttractionId: row.trip_attraction_id_from,
    toAttractionId: row.trip_attraction_id_to,
    transportMode: isTransportMode(row.transport_mode)
      ? row.transport_mode
      : null,
    duration: row.duration,
    route: row.route,
    notes: row.notes,
    images,
  };
}

// --- Repository functions ---

/** Confirms a connection is reachable through the given trip's days. */
export async function verifyBelongsToTrip(
  connectionId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT tc.id FROM trip_connections tc
     JOIN trip_days td ON td.id = tc.trip_day_id
     WHERE tc.id = ? AND td.trip_id = ?`,
    [connectionId, tripId],
  );
  return rows.length > 0;
}

/** Day and endpoint attractions of a connection. */
export interface ConnectionEndpoints {
  dayId: number;
  fromAttractionId: number;
  toAttractionId: number;
}

/**
 * Looks up a connection's day and endpoints, scoped to the given trip.
 *
 * @param connectionId - Connection to look up.
 * @param tripId - Trip the connection must belong to.
 * @returns The connection's day and endpoint attraction ids, or null when the
 *   connection does not exist or belongs to another trip.
 */
export async function findEndpointsInTrip(
  connectionId: number,
  tripId: number,
): Promise<ConnectionEndpoints | null> {
  const [rows] = await pool.execute<TripConnectionRow[]>(
    `SELECT tc.trip_day_id, tc.trip_attraction_id_from, tc.trip_attraction_id_to
     FROM trip_connections tc
     JOIN trip_days td ON td.id = tc.trip_day_id
     WHERE tc.id = ? AND td.trip_id = ?`,
    [connectionId, tripId],
  );
  if (rows.length === 0) {
    return null;
  }
  return {
    dayId: rows[0].trip_day_id,
    fromAttractionId: rows[0].trip_attraction_id_from,
    toAttractionId: rows[0].trip_attraction_id_to,
  };
}

/**
 * Confirms both endpoint attractions of a connection belong to the given day.
 *
 * @param dayId - Day the connection is attached to.
 * @param fromAttractionId - Origin attraction id.
 * @param toAttractionId - Destination attraction id; must differ from the origin.
 * @returns True only when two distinct attractions of that day matched.
 */
export async function attractionsBelongToDay(
  dayId: number,
  fromAttractionId: number,
  toAttractionId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM trip_attractions WHERE trip_day_id = ? AND id IN (?, ?)',
    [dayId, fromAttractionId, toAttractionId],
  );
  return rows.length === 2;
}

export async function create(
  dayId: number,
  data: CreateConnectionBody,
): Promise<TravelConnection> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO trip_connections
       (trip_day_id, trip_attraction_id_from, trip_attraction_id_to,
        transport_mode, duration, route, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      dayId,
      data.fromAttractionId,
      data.toAttractionId,
      data.transportMode,
      data.duration ?? null,
      data.route ?? null,
      data.notes ?? null,
    ],
  );

  return {
    id: result.insertId,
    fromAttractionId: data.fromAttractionId,
    toAttractionId: data.toAttractionId,
    transportMode: data.transportMode,
    duration: data.duration ?? null,
    route: data.route ?? null,
    notes: data.notes ?? null,
    images: [],
  };
}

/** Performs a partial update. Only fields present in data are changed. */
export async function update(
  connectionId: number,
  data: UpdateConnectionBody,
): Promise<TravelConnection | null> {
  const [rows] = await pool.execute<TripConnectionRow[]>(
    'SELECT * FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];

  await pool.execute(
    `UPDATE trip_connections
     SET trip_attraction_id_from = ?, trip_attraction_id_to = ?,
         transport_mode = ?, duration = ?, route = ?, notes = ?
     WHERE id = ?`,
    [
      data.fromAttractionId ?? cur.trip_attraction_id_from,
      data.toAttractionId ?? cur.trip_attraction_id_to,
      data.transportMode ?? cur.transport_mode,
      'duration' in data ? (data.duration ?? null) : cur.duration,
      'route' in data ? (data.route ?? null) : cur.route,
      'notes' in data ? (data.notes ?? null) : cur.notes,
      connectionId,
    ],
  );

  const [updatedRows] = await pool.execute<TripConnectionRow[]>(
    'SELECT * FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  const images = await imageRepo.getConnectionImages(connectionId);
  return toConnectionResponse(updatedRows[0], images);
}

export async function deleteById(connectionId: number): Promise<boolean> {
  const images = await imageRepo.getConnectionImages(connectionId);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  if (result.affectedRows > 0) {
    for (const img of images) {
      deleteImageFromDisk(img.filename);
    }
    logger.debug('Connection deleted', {
      connectionId,
      imagesDeleted: images.length,
    });
  }
  return result.affectedRows > 0;
}
