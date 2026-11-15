import type { Attraction } from '@tripdeck/shared';
import type { ResultSetHeader } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { copyImageFile } from '../../storage/imageFiles';
import { withTransaction } from '../../utils/withTransaction';
import * as imageRepo from '../image';
import { nextSortOrderInDay } from '../shared/daySortOrder';

import {
  getWebsites,
  insertWebsites,
  toAttractionResponse,
  TripAttractionRow,
} from './shared';

const logger = createLogger('attraction');

/**
 * Duplicates an attraction to the end of the given day.
 * Reference websites are copied verbatim; images are copied as new files with
 * fresh UUID filenames so deleting one copy does not affect the other.
 */
export async function duplicate(
  attractionId: number,
  dayId: number,
): Promise<Attraction> {
  const [rows] = await pool.execute<TripAttractionRow[]>(
    'SELECT * FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (rows.length === 0) {
    logger.warn('Cannot duplicate attraction: not found', { attractionId });
    throw new Error('Attraction not found');
  }
  const original = rows[0];

  const [websites, images] = await Promise.all([
    getWebsites(attractionId),
    imageRepo.getAttractionImages(attractionId),
  ]);

  let inserted: { newAttractionId: number; sortOrder: number };
  try {
    inserted = await withTransaction(async conn => {
      const nextSortOrder = await nextSortOrderInDay(
        conn,
        'trip_attractions',
        dayId,
      );

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO trip_attractions
           (trip_day_id, name, google_map_url, notes, nearby_attractions, start_time, end_time, sort_order,
            latitude, longitude, geo_source, geo_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dayId,
          original.name,
          original.google_map_url,
          original.notes,
          original.nearby_attractions,
          original.start_time,
          original.end_time,
          nextSortOrder,
          original.latitude ?? null,
          original.longitude ?? null,
          original.geo_source ?? null,
          original.geo_key ?? null,
        ],
      );
      await insertWebsites(conn, result.insertId, websites);

      return { newAttractionId: result.insertId, sortOrder: nextSortOrder };
    });
  } catch (err) {
    logger.error(
      'Failed to duplicate attraction, rolled back',
      { attractionId, dayId },
      err,
    );
    throw err;
  }
  const { newAttractionId, sortOrder } = inserted;

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
    } else {
      logger.warn('Skipped copying image during attraction duplication', {
        sourceFilename: img.filename,
        attractionId,
        newAttractionId,
      });
    }
  }

  logger.debug('Attraction duplicated', {
    attractionId,
    newAttractionId,
    dayId,
    imagesCopied: copiedImages.length,
    imagesSkipped: images.length - copiedImages.length,
  });

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
      sort_order: sortOrder,
      latitude: original.latitude ?? null,
      longitude: original.longitude ?? null,
      geo_source: original.geo_source ?? null,
      geo_key: original.geo_key ?? null,
    } as TripAttractionRow,
    websites,
    copiedImages,
  );
}
