import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import {
  deleteImageFromDisk,
  saveImportedImageBuffer,
} from '../../middleware/upload';
import type { ImportedTripResult, TripBackupData } from '../../types/backup';
import type { ImageResponse } from '../../types/trip';
import * as imageRepo from '../imageRepository';

const logger = createLogger('backup');

/**
 * Returns `desiredTitle` unchanged if no trip already uses it, otherwise
 * appends the lowest available " (n)" suffix (starting at 2).
 */
export async function generateUniqueTripTitle(
  desiredTitle: string,
): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT title FROM trips');
  const existingTitles = new Set(
    rows.map(row => (row as { title: string }).title),
  );

  if (!existingTitles.has(desiredTitle)) {
    return desiredTitle;
  }

  let suffix = 2;
  while (existingTitles.has(`${desiredTitle} (${suffix})`)) {
    suffix++;
  }
  const resolvedTitle = `${desiredTitle} (${suffix})`;
  logger.debug('Resolved a title collision during import', {
    desiredTitle,
    resolvedTitle,
  });
  return resolvedTitle;
}

interface PendingImage {
  newParentId: number;
  filename: string;
  title: string;
  add: (
    parentId: number,
    filename: string,
    title: string,
  ) => Promise<ImageResponse>;
}

/**
 * Imports one trip's backup data as a brand-new trip.
 *
 * All database rows are written inside one transaction, remapping every
 * old ID to the newly-inserted one as it goes (days, locations,
 * attractions/websites, connections, and the full checklist subtree).
 * Attractions are inserted before connections in a dedicated second pass:
 * `trip_connections.trip_attraction_id_from/_to` has no `ON DELETE` clause
 * (MySQL defaults to RESTRICT), which also blocks inserting a connection
 * that references an attraction row that does not exist yet.
 *
 * Image files are copied to disk only after the transaction commits
 * (mirroring attractionDuplicate.ts). If that step fails partway through,
 * every file already written is deleted and the newly-created trip is
 * removed (its `ON DELETE CASCADE` chain takes every DB row with it), so a
 * failed import never leaves a partially-created trip behind.
 */
export async function importSingleTrip(
  data: TripBackupData,
  imageBuffers: Map<string, Buffer>,
): Promise<ImportedTripResult> {
  const title = await generateUniqueTripTitle(data.trip.title.trim());
  logger.debug('Starting trip import transaction', {
    originalTripId: data.trip.id,
    title,
  });

  const dayIdMap = new Map<number, number>();
  const attractionIdMap = new Map<number, number>();
  const itemIdMap = new Map<number, number>();
  const pendingImages: PendingImage[] = [];

  const conn = await pool.getConnection();
  let newTripId: number;
  try {
    await conn.beginTransaction();

    const [tripResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO trips (title, destination, start_date, end_date, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        data.trip.destination,
        data.trip.startDate,
        data.trip.endDate,
        data.trip.description,
        new Date(),
      ],
    );
    newTripId = tripResult.insertId;

    for (const image of data.trip.images) {
      pendingImages.push({
        newParentId: newTripId,
        filename: image.filename,
        title: image.title,
        add: imageRepo.addTripImage,
      });
    }

    // First pass: days, locations, attractions (+ reference websites).
    // Connections are deliberately deferred to a second pass below.
    for (const day of data.content.days) {
      const [dayResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO trip_days (trip_id, day, date, notes) VALUES (?, ?, ?, ?)',
        [newTripId, day.day, day.date, day.notes],
      );
      const newDayId = dayResult.insertId;
      dayIdMap.set(day.id, newDayId);

      for (const image of day.images) {
        pendingImages.push({
          newParentId: newDayId,
          filename: image.filename,
          title: image.title,
          add: imageRepo.addDayImage,
        });
      }

      for (let i = 0; i < day.locations.length; i++) {
        await conn.execute(
          'INSERT INTO trip_day_locations (trip_day_id, name, sort_order) VALUES (?, ?, ?)',
          [newDayId, day.locations[i].name, i],
        );
      }

      for (const attraction of day.attractions) {
        const [attractionResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO trip_attractions
             (trip_day_id, name, google_map_url, notes, nearby_attractions, start_time, end_time, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newDayId,
            attraction.name,
            attraction.googleMapUrl,
            attraction.notes,
            attraction.nearbyAttractions,
            attraction.startTime,
            attraction.endTime,
            attraction.sortOrder,
          ],
        );
        const newAttractionId = attractionResult.insertId;
        attractionIdMap.set(attraction.id, newAttractionId);

        for (const site of attraction.referenceWebsites) {
          await conn.execute(
            'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
            [newAttractionId, site.url, site.title],
          );
        }

        for (const image of attraction.images) {
          pendingImages.push({
            newParentId: newAttractionId,
            filename: image.filename,
            title: image.title,
            add: imageRepo.addAttractionImage,
          });
        }
      }
    }

    // Second pass: connections, now that every attraction they might
    // reference has been inserted and remapped above.
    logger.debug('Importing connections (second pass)', {
      originalTripId: data.trip.id,
      dayCount: data.content.days.length,
    });
    for (const day of data.content.days) {
      const newDayId = dayIdMap.get(day.id);
      if (newDayId === undefined) {
        const message = `Day ${day.id} was not imported before its connections`;
        logger.error('Trip import consistency error', {
          originalTripId: data.trip.id,
          message,
        });
        throw new Error(message);
      }

      for (const connection of day.connections) {
        const newFromId = attractionIdMap.get(connection.fromAttractionId);
        const newToId = attractionIdMap.get(connection.toAttractionId);
        if (newFromId === undefined || newToId === undefined) {
          const message = `Connection ${connection.id} references an attraction that was not imported`;
          logger.error('Trip import consistency error', {
            originalTripId: data.trip.id,
            message,
          });
          throw new Error(message);
        }

        const [connectionResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO trip_connections
             (trip_day_id, trip_attraction_id_from, trip_attraction_id_to, transport_mode, duration, route, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newDayId,
            newFromId,
            newToId,
            connection.transportMode,
            connection.duration,
            connection.route,
            connection.notes,
          ],
        );
        const newConnectionId = connectionResult.insertId;

        for (const image of connection.images) {
          pendingImages.push({
            newParentId: newConnectionId,
            filename: image.filename,
            title: image.title,
            add: imageRepo.addConnectionImage,
          });
        }
      }
    }

    if (data.checklist) {
      logger.debug('Importing checklist', {
        originalTripId: data.trip.id,
        categoryCount: data.checklist.categories.length,
        occasionCount: data.checklist.occasions.length,
      });
      for (const category of data.checklist.categories) {
        const [categoryResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
          [newTripId, category.name],
        );
        const newCategoryId = categoryResult.insertId;

        for (const item of category.items) {
          const [itemResult] = await conn.execute<ResultSetHeader>(
            'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
            [
              newCategoryId,
              item.name,
              item.quantity,
              item.notes,
              item.storage_location,
            ],
          );
          const newItemId = itemResult.insertId;
          itemIdMap.set(item.id, newItemId);

          for (const spec of item.specs) {
            await conn.execute(
              'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
              [newItemId, spec.name, spec.storage_location],
            );
          }
        }
      }

      for (const occasion of data.checklist.occasions) {
        const [occasionResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
          [newTripId, occasion.name],
        );
        const newOccasionId = occasionResult.insertId;

        for (const [itemIdStr, checked] of Object.entries(occasion.checks)) {
          if (!checked) {
            continue;
          }
          const newItemId = itemIdMap.get(Number(itemIdStr));
          if (newItemId === undefined) {
            const message = `Occasion ${occasion.id} references checklist item ${itemIdStr} that was not imported`;
            logger.error('Trip import consistency error', {
              originalTripId: data.trip.id,
              message,
            });
            throw new Error(message);
          }
          await conn.execute(
            'INSERT INTO checklist_checks (checklist_occasion_id, checklist_trip_item_id, checked) VALUES (?, ?, 1)',
            [newOccasionId, newItemId],
          );
        }
      }
    }

    await conn.commit();
    logger.debug('Trip import transaction committed', {
      originalTripId: data.trip.id,
      newTripId,
    });
  } catch (err) {
    await conn.rollback();
    logger.error(
      'Trip import transaction failed, rolled back',
      { originalTripId: data.trip.id, title },
      err,
    );
    throw err;
  } finally {
    conn.release();
  }

  logger.debug('Writing imported trip images to disk', {
    originalTripId: data.trip.id,
    newTripId,
    imageCount: pendingImages.length,
  });
  const writtenFilenames: string[] = [];
  try {
    for (const pending of pendingImages) {
      const buffer = imageBuffers.get(pending.filename);
      if (!buffer) {
        throw new Error(`Missing image data for ${pending.filename}`);
      }
      const newFilename = saveImportedImageBuffer(buffer, pending.filename);
      writtenFilenames.push(newFilename);
      await pending.add(pending.newParentId, newFilename, pending.title);
    }
  } catch (err) {
    logger.error(
      'Failed to write imported trip images; rolling back the new trip',
      {
        newTripId,
        title,
        filesWrittenBeforeFailure: writtenFilenames.length,
        totalImages: pendingImages.length,
      },
      err,
    );
    for (const filename of writtenFilenames) {
      deleteImageFromDisk(filename);
    }
    await pool.execute('DELETE FROM trips WHERE id = ?', [newTripId]);
    throw err;
  }

  logger.info('Trip imported successfully', {
    originalTripId: data.trip.id,
    newTripId,
    title,
    daysImported: data.content.days.length,
    imagesImported: pendingImages.length,
  });
  return { originalTripId: data.trip.id, newTripId, title };
}
