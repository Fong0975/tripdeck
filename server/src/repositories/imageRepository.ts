import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import { createLogger } from '../logger';
import { deleteImageFromDisk } from '../middleware/upload';
import type { ImageResponse } from '../types/trip';

const logger = createLogger('image');

interface ImageRow extends RowDataPacket {
  id: number;
  filename: string;
  title: string;
}

function toImageResponse(row: ImageRow): ImageResponse {
  return {
    id: row.id,
    filename: row.filename,
    title: row.title,
  };
}

/**
 * Builds the CRUD functions for one entity's image table. The three image
 * tables (`trip_attraction_images`, `trip_connection_images`, `trip_images`)
 * all share the same shape — one row per image, with a single foreign-key
 * column pointing back to the parent entity — so this is generated once per
 * table/column pair instead of being hand-duplicated for each entity.
 */
function createImageRepo(table: string, idColumn: string) {
  async function getImages(parentId: number): Promise<ImageResponse[]> {
    const [rows] = await pool.execute<ImageRow[]>(
      `SELECT * FROM ${table} WHERE ${idColumn} = ? ORDER BY id`,
      [parentId],
    );
    return rows.map(toImageResponse);
  }

  /**
   * Batch-fetches images for multiple parents in a single query.
   * Returns a map from parent ID to its image list.
   */
  async function getImagesBatch(
    parentIds: number[],
  ): Promise<Map<number, ImageResponse[]>> {
    const result = new Map<number, ImageResponse[]>();
    if (parentIds.length === 0) {
      return result;
    }

    const ph = parentIds.map(() => '?').join(', ');
    const [rows] = await pool.execute<ImageRow[]>(
      `SELECT * FROM ${table}
       WHERE ${idColumn} IN (${ph})
       ORDER BY ${idColumn}, id`,
      parentIds,
    );

    for (const row of rows) {
      const parentId = row[idColumn] as number;
      const list = result.get(parentId) ?? [];
      list.push(toImageResponse(row));
      result.set(parentId, list);
    }

    return result;
  }

  async function addImage(
    parentId: number,
    filename: string,
    title: string,
  ): Promise<ImageResponse> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO ${table} (${idColumn}, filename, title) VALUES (?, ?, ?)`,
        [parentId, filename, title],
      );

      return { id: result.insertId, filename, title };
    } catch (err) {
      // The file has already been written to disk by the caller at this
      // point (saveImageToDisk/saveImportedImageBuffer runs first) — a
      // failure here leaves an orphaned file with no DB row, which is
      // exactly the gap this log is meant to surface.
      logger.error(
        'Failed to insert image row after file was written to disk',
        { table, idColumn, parentId, filename },
        err,
      );
      throw err;
    }
  }

  async function deleteImage(
    imageId: number,
    parentId: number,
  ): Promise<boolean> {
    const [rows] = await pool.execute<ImageRow[]>(
      `SELECT * FROM ${table} WHERE id = ? AND ${idColumn} = ?`,
      [imageId, parentId],
    );

    if (rows.length === 0) {
      return false;
    }

    await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [imageId]);

    deleteImageFromDisk(rows[0].filename);
    logger.debug('Image deleted', {
      table,
      imageId,
      parentId,
      filename: rows[0].filename,
    });
    return true;
  }

  return { getImages, getImagesBatch, addImage, deleteImage };
}

const attractionImages = createImageRepo(
  'trip_attraction_images',
  'trip_attraction_id',
);
const connectionImages = createImageRepo(
  'trip_connection_images',
  'trip_connection_id',
);
const tripImages = createImageRepo('trip_images', 'trip_id');
const dayImages = createImageRepo('trip_day_images', 'trip_day_id');

// --- Attraction images ---

export const getAttractionImages = attractionImages.getImages;
export const getAttractionImagesBatch = attractionImages.getImagesBatch;
export const addAttractionImage = attractionImages.addImage;
export const deleteAttractionImage = attractionImages.deleteImage;

// --- Connection images ---

export const getConnectionImages = connectionImages.getImages;
export const getConnectionImagesBatch = connectionImages.getImagesBatch;
export const addConnectionImage = connectionImages.addImage;
export const deleteConnectionImage = connectionImages.deleteImage;

// --- Trip images ---

export const getTripImages = tripImages.getImages;
export const getTripImagesBatch = tripImages.getImagesBatch;
export const addTripImage = tripImages.addImage;
export const deleteTripImage = tripImages.deleteImage;

// --- Day images ---

export const getDayImages = dayImages.getImages;
export const getDayImagesBatch = dayImages.getImagesBatch;
export const addDayImage = dayImages.addImage;
export const deleteDayImage = dayImages.deleteImage;
