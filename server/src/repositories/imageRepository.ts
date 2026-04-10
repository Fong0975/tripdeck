import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import { deleteImageFromDisk } from '../middleware/upload';
import type { ImageResponse } from '../types/trip';

// --- Row types ---

interface AttractionImageRow extends RowDataPacket {
  id: number;
  trip_attraction_id: number;
  filename: string;
  title: string;
}

interface ConnectionImageRow extends RowDataPacket {
  id: number;
  trip_connection_id: number;
  filename: string;
  title: string;
}

// --- Helpers ---

function toImageResponse(
  row: AttractionImageRow | ConnectionImageRow,
): ImageResponse {
  return {
    id: row.id,
    filename: row.filename,
    title: row.title,
  };
}

// --- Attraction images ---

export async function getAttractionImages(
  attractionId: number,
): Promise<ImageResponse[]> {
  const [rows] = await pool.execute<AttractionImageRow[]>(
    'SELECT * FROM trip_attraction_images WHERE trip_attraction_id = ? ORDER BY id',
    [attractionId],
  );
  return rows.map(toImageResponse);
}

/**
 * Batch-fetches images for multiple attractions in a single query.
 * Returns a map from attraction ID to its image list.
 */
export async function getAttractionImagesBatch(
  attractionIds: number[],
): Promise<Map<number, ImageResponse[]>> {
  const result = new Map<number, ImageResponse[]>();
  if (attractionIds.length === 0) {
    return result;
  }

  const ph = attractionIds.map(() => '?').join(', ');
  const [rows] = await pool.execute<AttractionImageRow[]>(
    `SELECT * FROM trip_attraction_images
     WHERE trip_attraction_id IN (${ph})
     ORDER BY trip_attraction_id, id`,
    attractionIds,
  );

  for (const row of rows) {
    const list = result.get(row.trip_attraction_id) ?? [];
    list.push(toImageResponse(row));
    result.set(row.trip_attraction_id, list);
  }

  return result;
}

export async function addAttractionImage(
  attractionId: number,
  filename: string,
  title: string,
): Promise<ImageResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO trip_attraction_images (trip_attraction_id, filename, title) VALUES (?, ?, ?)',
    [attractionId, filename, title],
  );

  return { id: result.insertId, filename, title };
}

export async function deleteAttractionImage(
  imageId: number,
  attractionId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<AttractionImageRow[]>(
    'SELECT * FROM trip_attraction_images WHERE id = ? AND trip_attraction_id = ?',
    [imageId, attractionId],
  );

  if (rows.length === 0) {
    return false;
  }

  await pool.execute('DELETE FROM trip_attraction_images WHERE id = ?', [
    imageId,
  ]);

  deleteImageFromDisk(rows[0].filename);
  return true;
}

// --- Connection images ---

export async function getConnectionImages(
  connectionId: number,
): Promise<ImageResponse[]> {
  const [rows] = await pool.execute<ConnectionImageRow[]>(
    'SELECT * FROM trip_connection_images WHERE trip_connection_id = ? ORDER BY id',
    [connectionId],
  );
  return rows.map(toImageResponse);
}

/**
 * Batch-fetches images for multiple connections in a single query.
 * Returns a map from connection ID to its image list.
 */
export async function getConnectionImagesBatch(
  connectionIds: number[],
): Promise<Map<number, ImageResponse[]>> {
  const result = new Map<number, ImageResponse[]>();
  if (connectionIds.length === 0) {
    return result;
  }

  const ph = connectionIds.map(() => '?').join(', ');
  const [rows] = await pool.execute<ConnectionImageRow[]>(
    `SELECT * FROM trip_connection_images
     WHERE trip_connection_id IN (${ph})
     ORDER BY trip_connection_id, id`,
    connectionIds,
  );

  for (const row of rows) {
    const list = result.get(row.trip_connection_id) ?? [];
    list.push(toImageResponse(row));
    result.set(row.trip_connection_id, list);
  }

  return result;
}

export async function addConnectionImage(
  connectionId: number,
  filename: string,
  title: string,
): Promise<ImageResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO trip_connection_images (trip_connection_id, filename, title) VALUES (?, ?, ?)',
    [connectionId, filename, title],
  );

  return { id: result.insertId, filename, title };
}

export async function deleteConnectionImage(
  imageId: number,
  connectionId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<ConnectionImageRow[]>(
    'SELECT * FROM trip_connection_images WHERE id = ? AND trip_connection_id = ?',
    [imageId, connectionId],
  );

  if (rows.length === 0) {
    return false;
  }

  await pool.execute('DELETE FROM trip_connection_images WHERE id = ?', [
    imageId,
  ]);

  deleteImageFromDisk(rows[0].filename);
  return true;
}
