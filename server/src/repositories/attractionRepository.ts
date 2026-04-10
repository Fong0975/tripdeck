import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  AttractionResponse,
  CreateAttractionBody,
  ImageResponse,
  ReferenceWebsite,
  UpdateAttractionBody,
} from '../types/trip';

import * as imageRepo from './imageRepository';

// --- Row types ---

interface TripAttractionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  name: string;
  google_map_url: string | null;
  notes: string | null;
  nearby_attractions: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
}

interface TripAttractionWebsiteRow extends RowDataPacket {
  id: number;
  trip_attraction_id: number;
  url: string;
  title: string;
}

// --- Helpers ---

async function getWebsites(attractionId: number): Promise<ReferenceWebsite[]> {
  const [rows] = await pool.execute<TripAttractionWebsiteRow[]>(
    'SELECT url, title FROM trip_attraction_websites WHERE trip_attraction_id = ? ORDER BY id',
    [attractionId],
  );
  return rows.map(r => ({ url: r.url, title: r.title }));
}

function toAttractionResponse(
  row: TripAttractionRow,
  referenceWebsites: ReferenceWebsite[],
  images: ImageResponse[],
): AttractionResponse {
  return {
    id: row.id,
    name: row.name,
    googleMapUrl: row.google_map_url,
    notes: row.notes,
    nearbyAttractions: row.nearby_attractions,
    startTime: row.start_time,
    endTime: row.end_time,
    referenceWebsites,
    images,
    sortOrder: row.sort_order,
  };
}

// --- Repository functions ---

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

export async function deleteById(attractionId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  return result.affectedRows > 0;
}

/**
 * Updates sort_order for each attraction in the given day according to the
 * position in orderedIds. IDs not belonging to dayId are silently ignored.
 */
export async function updateOrder(
  dayId: number,
  orderedIds: number[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.execute(
        'UPDATE trip_attractions SET sort_order = ? WHERE id = ? AND trip_day_id = ?',
        [i, orderedIds[i], dayId],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
