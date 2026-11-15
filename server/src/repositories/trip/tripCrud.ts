import type { CreateTripBody, Trip, UpdateTripBody } from '@tripdeck/shared';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../storage/imageFiles';
import { withTransaction } from '../../utils/withTransaction';
import * as imageRepo from '../image';

import { getDatesInRange, toDateString, toTripResponse } from './helpers';
import { planTripDayChanges, reconcileTripDays } from './tripDayReconcile';
import type { TripDayRow, TripRow } from './types';

const logger = createLogger('trip');

/**
 * Selects a single trip row by id.
 *
 * @param id - Trip id.
 * @returns The row, or undefined when the trip does not exist.
 */
async function selectTripRow(id: number): Promise<TripRow | undefined> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips WHERE id = ?',
    [id],
  );
  return rows[0];
}

/**
 * Checks whether a trip exists without loading its row or images.
 *
 * @param id - Trip id.
 * @returns True when the trip exists.
 */
export async function tripExists(id: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM trips WHERE id = ?',
    [id],
  );
  return rows.length > 0;
}

/**
 * Lists every trip, newest start date first, with its images.
 *
 * @returns All trips.
 */
export async function findAll(): Promise<Trip[]> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips ORDER BY start_date DESC, created_at DESC',
  );
  const imagesByTrip = await imageRepo.getTripImagesBatch(rows.map(r => r.id));
  return rows.map(row => toTripResponse(row, imagesByTrip.get(row.id) ?? []));
}

/**
 * Looks up a trip with its images.
 *
 * @param id - Trip id.
 * @returns The trip, or null when it does not exist.
 */
export async function findById(id: number): Promise<Trip | null> {
  const row = await selectTripRow(id);
  if (!row) {
    return null;
  }
  const images = await imageRepo.getTripImages(id);
  return toTripResponse(row, images);
}

/**
 * Creates a trip and auto-generates one trip_days row per calendar day
 * between startDate and endDate (inclusive).
 *
 * @param data - New trip fields.
 * @returns The created trip (without images).
 */
export async function create(data: CreateTripBody): Promise<Trip> {
  let tripId: number;
  try {
    tripId = await withTransaction(async conn => {
      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO trips (title, destination, start_date, end_date, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.title,
          data.destination ?? null,
          data.startDate,
          data.endDate,
          data.description ?? null,
          new Date(),
        ],
      );
      const insertedId = result.insertId;

      const dates = getDatesInRange(data.startDate, data.endDate);
      for (let i = 0; i < dates.length; i++) {
        await conn.execute(
          'INSERT INTO trip_days (trip_id, day, date) VALUES (?, ?, ?)',
          [insertedId, i + 1, dates[i]],
        );
      }
      return insertedId;
    });
  } catch (err) {
    logger.error(
      'Failed to create trip, rolled back',
      { title: data.title, startDate: data.startDate, endDate: data.endDate },
      err,
    );
    throw err;
  }

  return toTripResponse((await selectTripRow(tripId))!);
}

/**
 * Updates a trip's fields, reconciling `trip_days` with the new date range
 * if `startDate`/`endDate` change:
 *  - dates no longer within the new range are removed, along with all of
 *    their attractions, connections, websites, locations and images;
 *  - dates newly within range that don't already have a trip_day get one;
 *  - all remaining days are renumbered sequentially by date.
 *
 * Every row change runs in a single transaction, so a failure leaves the
 * trip exactly as it was. Image files belonging to removed rows are only
 * unlinked from disk after that transaction commits.
 *
 * @param id - Trip to update.
 * @param data - Fields to change; absent fields keep their current value.
 * @returns The updated trip, or null when it does not exist.
 */
export async function update(
  id: number,
  data: UpdateTripBody,
): Promise<Trip | null> {
  const cur = await selectTripRow(id);
  if (!cur) {
    return null;
  }

  const newStart = data.startDate ?? toDateString(cur.start_date);
  const newEnd = data.endDate ?? toDateString(cur.end_date);

  const [dayRows] = await pool.execute<TripDayRow[]>(
    'SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date',
    [id],
  );
  const plan = planTripDayChanges(dayRows, newStart, newEnd);

  let removedImageFilenames: string[];
  try {
    removedImageFilenames = await withTransaction(async conn => {
      const filenames = await reconcileTripDays(conn, id, plan);

      await conn.execute(
        `UPDATE trips SET title = ?, destination = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?`,
        [
          data.title?.trim() ?? cur.title,
          'destination' in data ? (data.destination ?? null) : cur.destination,
          newStart,
          newEnd,
          'description' in data ? (data.description ?? null) : cur.description,
          id,
        ],
      );

      return filenames;
    });
  } catch (err) {
    logger.error(
      'Failed to update trip, rolled back',
      {
        tripId: id,
        daysToRemove: plan.dayIdsToRemove.length,
        datesToAdd: plan.datesToAdd.length,
      },
      err,
    );
    throw err;
  }

  for (const filename of removedImageFilenames) {
    deleteImageFromDisk(filename);
  }

  logger.info('Trip updated', {
    tripId: id,
    daysRemoved: plan.dayIdsToRemove.length,
    daysAdded: plan.datesToAdd.length,
    imagesRemoved: removedImageFilenames.length,
  });

  const freshRow = await selectTripRow(id);
  const images = await imageRepo.getTripImages(id);
  return toTripResponse(freshRow!, images);
}
