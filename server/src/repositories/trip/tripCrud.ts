import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { deleteImageFromDisk } from '../../middleware/upload';
import type {
  CreateTripBody,
  TripResponse,
  UpdateTripBody,
} from '../../types/trip';
import * as attractionCrud from '../attraction/attractionCrud';
import * as connectionRepo from '../connectionRepository';
import * as imageRepo from '../imageRepository';

import { getDatesInRange, toDateString, toTripResponse } from './helpers';
import { TripDayRow, TripRow } from './types';

const logger = createLogger('trip');

interface TripDayIdRow extends RowDataPacket {
  id: number;
}

interface TripAttractionIdRow extends RowDataPacket {
  id: number;
}

interface TripConnectionIdRow extends RowDataPacket {
  id: number;
}

export async function findAll(): Promise<TripResponse[]> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips ORDER BY created_at DESC',
  );
  const imagesByTrip = await imageRepo.getTripImagesBatch(rows.map(r => r.id));
  return rows.map(row => toTripResponse(row, imagesByTrip.get(row.id) ?? []));
}

export async function findById(id: number): Promise<TripResponse | null> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips WHERE id = ?',
    [id],
  );
  if (rows.length === 0) {
    return null;
  }
  const images = await imageRepo.getTripImages(id);
  return toTripResponse(rows[0], images);
}

/**
 * Creates a trip and auto-generates one trip_days row per calendar day
 * between startDate and endDate (inclusive).
 */
export async function create(data: CreateTripBody): Promise<TripResponse> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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
    const tripId = result.insertId;

    const dates = getDatesInRange(data.startDate, data.endDate);
    for (let i = 0; i < dates.length; i++) {
      await conn.execute(
        'INSERT INTO trip_days (trip_id, day, date) VALUES (?, ?, ?)',
        [tripId, i + 1, dates[i]],
      );
    }

    await conn.commit();
    logger.info('Trip created', { tripId, daysCreated: dates.length });

    const [rows] = await pool.execute<TripRow[]>(
      'SELECT * FROM trips WHERE id = ?',
      [tripId],
    );
    return toTripResponse(rows[0]);
  } catch (err) {
    await conn.rollback();
    logger.error(
      'Failed to create trip, rolled back',
      { title: data.title, startDate: data.startDate, endDate: data.endDate },
      err,
    );
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Updates a trip's fields, reconciling `trip_days` with the new date range
 * if `startDate`/`endDate` change:
 *  - dates no longer within the new range are removed, along with all of
 *    their attractions, connections, and images (cascading through
 *    attractionCrud.deleteById, which also cleans up image files on disk),
 *    plus the day's own images (their trip_day_images rows cascade via
 *    ON DELETE CASCADE when the trip_days row is removed, but the files on
 *    disk are cleaned up explicitly below, once that removal has committed);
 *  - dates newly within range that don't already have a trip_day get one;
 *  - all remaining days are renumbered sequentially by date.
 *
 * The attraction/connection/image cleanup for removed days happens *before*
 * this function's own transaction, because attractionCrud.deleteById() uses
 * its own top-level pool.execute calls and cannot participate in a shared
 * connection transaction. If that cleanup partially fails, the affected
 * day(s) are left with no attractions but the trip_days/trips rows are
 * unchanged; retrying the update recovers cleanly since the recomputed diff
 * will find those days already empty. This mirrors the same non-atomic,
 * best-effort tradeoff already accepted by attractionCrud.deleteById itself.
 */
export async function update(
  id: number,
  data: UpdateTripBody,
): Promise<TripResponse | null> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips WHERE id = ?',
    [id],
  );
  if (rows.length === 0) {
    return null;
  }
  const cur = rows[0];

  const newStart = data.startDate ?? toDateString(cur.start_date);
  const newEnd = data.endDate ?? toDateString(cur.end_date);

  const [dayRows] = await pool.execute<TripDayRow[]>(
    'SELECT * FROM trip_days WHERE trip_id = ? ORDER BY date',
    [id],
  );

  const newDateSet = new Set(getDatesInRange(newStart, newEnd));
  const existingDateSet = new Set(dayRows.map(d => toDateString(d.date)));
  const daysToRemove = dayRows.filter(
    d => !newDateSet.has(toDateString(d.date)),
  );
  const datesToAdd = [...newDateSet].filter(d => !existingDateSet.has(d));

  // trip_connections always belong to the same trip_day as both of their
  // endpoint attractions (the UI only ever creates connections between
  // adjacent attractions within one day, see attractionOrder.ts), so
  // deleting every attraction on a removed day is guaranteed to also remove
  // every connection on that day; no cross-day orphans are possible.
  for (const day of daysToRemove) {
    const [attrRows] = await pool.execute<TripAttractionIdRow[]>(
      'SELECT id FROM trip_attractions WHERE trip_day_id = ?',
      [day.id],
    );
    try {
      for (const attr of attrRows) {
        await attractionCrud.deleteById(attr.id);
      }
    } catch (err) {
      // Non-atomic by design (see function doc comment above): this throws
      // before the transaction below even starts, so trips/trip_days are
      // untouched, but any attraction already deleted on this day stays
      // deleted. Logging exactly which day/attraction failed is the only
      // way to tell which parts of this best-effort cleanup actually ran.
      logger.error(
        'Partial failure while clearing attractions for a removed day',
        { tripId: id, dayId: day.id },
        err,
      );
      throw err;
    }
  }

  const dayImagesByDayId = await imageRepo.getDayImagesBatch(
    daysToRemove.map(d => d.id),
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const day of daysToRemove) {
      await conn.execute('DELETE FROM trip_days WHERE id = ?', [day.id]);
    }

    // Placeholder `day` values are negative so they can never collide with
    // the existing positive values while both are briefly present.
    for (let i = 0; i < datesToAdd.length; i++) {
      await conn.execute(
        'INSERT INTO trip_days (trip_id, day, date) VALUES (?, ?, ?)',
        [id, -(i + 1), datesToAdd[i]],
      );
    }

    // Renumber every remaining day sequentially by date. Bumping everything
    // out of range first avoids collisions with the unique (trip_id, day)
    // key while days shift (e.g. removing the first day requires every
    // later day to move down by one).
    await conn.execute(
      'UPDATE trip_days SET day = day + 100000 WHERE trip_id = ?',
      [id],
    );
    const [finalRows] = await conn.query<TripDayRow[]>(
      'SELECT id FROM trip_days WHERE trip_id = ? ORDER BY date',
      [id],
    );
    for (let i = 0; i < finalRows.length; i++) {
      await conn.execute('UPDATE trip_days SET day = ? WHERE id = ?', [
        i + 1,
        finalRows[i].id,
      ]);
    }

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

    await conn.commit();

    let imagesRemoved = 0;
    for (const day of daysToRemove) {
      const dayImages = dayImagesByDayId.get(day.id) ?? [];
      for (const img of dayImages) {
        deleteImageFromDisk(img.filename);
        imagesRemoved++;
      }
    }

    logger.info('Trip updated', {
      tripId: id,
      daysRemoved: daysToRemove.length,
      daysAdded: datesToAdd.length,
      imagesRemoved,
    });
  } catch (err) {
    await conn.rollback();
    logger.error(
      'Failed to update trip, rolled back',
      {
        tripId: id,
        daysToRemove: daysToRemove.length,
        datesToAdd: datesToAdd.length,
      },
      err,
    );
    throw err;
  } finally {
    conn.release();
  }

  const [freshRows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips WHERE id = ?',
    [id],
  );
  const images = await imageRepo.getTripImages(id);
  return toTripResponse(freshRows[0], images);
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
 */
export async function deleteById(id: number): Promise<boolean> {
  const [dayRows] = await pool.execute<TripDayIdRow[]>(
    'SELECT id FROM trip_days WHERE trip_id = ?',
    [id],
  );
  const dayIds = dayRows.map(row => row.id);

  const [attractionRows] = await pool.execute<TripAttractionIdRow[]>(
    `SELECT ta.id FROM trip_attractions ta
     JOIN trip_days td ON td.id = ta.trip_day_id
     WHERE td.trip_id = ?`,
    [id],
  );
  const attractionIds = attractionRows.map(row => row.id);

  const [connectionRows] = await pool.execute<TripConnectionIdRow[]>(
    `SELECT tc.id FROM trip_connections tc
     JOIN trip_days td ON td.id = tc.trip_day_id
     WHERE td.trip_id = ?`,
    [id],
  );
  for (const row of connectionRows) {
    await connectionRepo.deleteById(row.id);
  }

  const [images, dayImagesByDay, attractionImagesByAttraction] =
    await Promise.all([
      imageRepo.getTripImages(id),
      imageRepo.getDayImagesBatch(dayIds),
      imageRepo.getAttractionImagesBatch(attractionIds),
    ]);

  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trips WHERE id = ?',
    [id],
  );
  if (result.affectedRows > 0) {
    let imagesDeleted = 0;
    for (const img of images) {
      deleteImageFromDisk(img.filename);
      imagesDeleted++;
    }
    for (const dayImages of dayImagesByDay.values()) {
      for (const img of dayImages) {
        deleteImageFromDisk(img.filename);
        imagesDeleted++;
      }
    }
    for (const attractionImages of attractionImagesByAttraction.values()) {
      for (const img of attractionImages) {
        deleteImageFromDisk(img.filename);
        imagesDeleted++;
      }
    }
    logger.info('Trip deleted', {
      tripId: id,
      connectionsDeleted: connectionRows.length,
      imagesDeleted,
    });
  }
  return result.affectedRows > 0;
}
