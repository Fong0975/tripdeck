import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { copyImageFile } from '../../middleware/upload';
import type { AttractionResponse } from '../../types/trip';
import * as imageRepo from '../imageRepository';

import { getWebsites, toAttractionResponse, TripAttractionRow } from './shared';

/**
 * Duplicates an attraction to the end of the given day.
 * Reference websites are copied verbatim; images are copied as new files with
 * fresh UUID filenames so deleting one copy does not affect the other.
 */
export async function duplicate(
  attractionId: number,
  dayId: number,
): Promise<AttractionResponse> {
  const [rows] = await pool.execute<TripAttractionRow[]>(
    'SELECT * FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (rows.length === 0) {
    throw new Error('Attraction not found');
  }
  const original = rows[0];

  const [websites, images] = await Promise.all([
    getWebsites(attractionId),
    imageRepo.getAttractionImages(attractionId),
  ]);

  const conn = await pool.getConnection();
  let newAttractionId: number;
  let sortOrder: number;
  try {
    await conn.beginTransaction();

    const [countRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM trip_attractions WHERE trip_day_id = ?',
      [dayId],
    );
    sortOrder = (countRows[0] as { count: number }).count;

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO trip_attractions
         (trip_day_id, name, google_map_url, notes, nearby_attractions, start_time, end_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dayId,
        original.name,
        original.google_map_url,
        original.notes,
        original.nearby_attractions,
        original.start_time,
        original.end_time,
        sortOrder,
      ],
    );
    newAttractionId = result.insertId;

    for (const site of websites) {
      await conn.execute(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [newAttractionId, site.url, site.title],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const copiedImages: typeof images = [];
  for (const img of images) {
    const newFilename = copyImageFile(img.filename);
    if (newFilename) {
      const newImg = await imageRepo.addAttractionImage(
        newAttractionId,
        newFilename,
        img.title,
      );
      copiedImages.push(newImg);
    }
  }

  return toAttractionResponse(
    {
      id: newAttractionId,
      trip_day_id: dayId,
      name: original.name,
      google_map_url: original.google_map_url,
      notes: original.notes,
      nearby_attractions: original.nearby_attractions,
      start_time: original.start_time,
      end_time: original.end_time,
      sort_order: sortOrder!,
    } as TripAttractionRow,
    websites,
    copiedImages,
  );
}
