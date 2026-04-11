import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  AttractionResponse,
  ConnectionResponse,
  CreateTripBody,
  DayResponse,
  ReferenceWebsite,
  TripContentResponse,
  TripResponse,
} from '../types/trip';

import * as imageRepo from './imageRepository';

// --- Row types ---

interface TripRow extends RowDataPacket {
  id: number;
  title: string;
  destination: string | null;
  start_date: Date | string;
  end_date: Date | string;
  description: string | null;
  created_at: Date | string;
}

interface TripDayRow extends RowDataPacket {
  id: number;
  trip_id: number;
  day: number;
  date: Date | string;
}

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

interface TripConnectionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  trip_attraction_id_from: number;
  trip_attraction_id_to: number;
  transport_mode: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
}

// --- Helpers ---

function toDateString(d: Date | string): string {
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toISOString(d: Date | string): string {
  if (typeof d === 'string') {
    return new Date(d).toISOString();
  }
  return d.toISOString();
}

function toTripResponse(row: TripRow): TripResponse {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    description: row.description,
    createdAt: toISOString(row.created_at),
  };
}

/**
 * Returns all dates between startDate and endDate inclusive, as YYYY-MM-DD strings.
 * Used to auto-generate trip days on creation.
 */
function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

// --- Repository functions ---

export async function findAll(): Promise<TripResponse[]> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips ORDER BY created_at DESC',
  );
  return rows.map(toTripResponse);
}

export async function findById(id: number): Promise<TripResponse | null> {
  const [rows] = await pool.execute<TripRow[]>(
    'SELECT * FROM trips WHERE id = ?',
    [id],
  );
  return rows.length > 0 ? toTripResponse(rows[0]) : null;
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

    const [rows] = await pool.execute<TripRow[]>(
      'SELECT * FROM trips WHERE id = ?',
      [tripId],
    );
    return toTripResponse(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trips WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}

/** Finds a day only if it belongs to the given trip. */
export async function findDayByIdAndTripId(
  tripId: number,
  dayId: number,
): Promise<{ id: number; day: number; date: string } | null> {
  const [rows] = await pool.execute<TripDayRow[]>(
    'SELECT * FROM trip_days WHERE id = ? AND trip_id = ?',
    [dayId, tripId],
  );
  if (rows.length === 0) {
    return null;
  }
  return {
    id: rows[0].id,
    day: rows[0].day,
    date: toDateString(rows[0].date),
  };
}

/**
 * Fetches the full trip content: all days with their attractions
 * (including reference websites) and connections.
 * Executes three batched queries to avoid N+1.
 */
export async function findContent(
  tripId: number,
): Promise<TripContentResponse | null> {
  const trip = await findById(tripId);
  if (!trip) {
    return null;
  }

  const [dayRows] = await pool.execute<TripDayRow[]>(
    'SELECT * FROM trip_days WHERE trip_id = ? ORDER BY day',
    [tripId],
  );

  if (dayRows.length === 0) {
    return { tripId, days: [] };
  }

  const dayIds = dayRows.map(r => r.id);
  const dayPh = placeholders(dayIds.length);

  const [attractionRows] = await pool.execute<TripAttractionRow[]>(
    `SELECT * FROM trip_attractions
     WHERE trip_day_id IN (${dayPh})
     ORDER BY trip_day_id, sort_order`,
    dayIds,
  );

  // Batch-fetch websites only when there are attractions to look up.
  const websitesByAttractionId = new Map<number, ReferenceWebsite[]>();
  if (attractionRows.length > 0) {
    const attrIds = attractionRows.map(r => r.id);
    const attrPh = placeholders(attrIds.length);
    const [websiteRows] = await pool.execute<TripAttractionWebsiteRow[]>(
      `SELECT * FROM trip_attraction_websites
       WHERE trip_attraction_id IN (${attrPh})
       ORDER BY trip_attraction_id, id`,
      attrIds,
    );
    for (const row of websiteRows) {
      const sites = websitesByAttractionId.get(row.trip_attraction_id) ?? [];
      sites.push({ url: row.url, title: row.title });
      websitesByAttractionId.set(row.trip_attraction_id, sites);
    }
  }

  const [connectionRows] = await pool.execute<TripConnectionRow[]>(
    `SELECT * FROM trip_connections WHERE trip_day_id IN (${dayPh})`,
    dayIds,
  );

  // Batch-fetch images for attractions and connections.
  const attrIds = attractionRows.map(r => r.id);
  const connIds = connectionRows.map(r => r.id);
  const [imagesByAttractionId, imagesByConnectionId] = await Promise.all([
    imageRepo.getAttractionImagesBatch(attrIds),
    imageRepo.getConnectionImagesBatch(connIds),
  ]);

  // Group attractions and connections by their parent day ID.
  const attractionsByDayId = new Map<number, AttractionResponse[]>();
  for (const row of attractionRows) {
    const list = attractionsByDayId.get(row.trip_day_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      googleMapUrl: row.google_map_url,
      notes: row.notes,
      nearbyAttractions: row.nearby_attractions,
      startTime: row.start_time,
      endTime: row.end_time,
      referenceWebsites: websitesByAttractionId.get(row.id) ?? [],
      images: imagesByAttractionId.get(row.id) ?? [],
      sortOrder: row.sort_order,
    });
    attractionsByDayId.set(row.trip_day_id, list);
  }

  const connectionsByDayId = new Map<number, ConnectionResponse[]>();
  for (const row of connectionRows) {
    const list = connectionsByDayId.get(row.trip_day_id) ?? [];
    list.push({
      id: row.id,
      fromAttractionId: row.trip_attraction_id_from,
      toAttractionId: row.trip_attraction_id_to,
      transportMode: row.transport_mode,
      duration: row.duration,
      route: row.route,
      notes: row.notes,
      images: imagesByConnectionId.get(row.id) ?? [],
    });
    connectionsByDayId.set(row.trip_day_id, list);
  }

  const days: DayResponse[] = dayRows.map(row => ({
    id: row.id,
    day: row.day,
    date: toDateString(row.date),
    attractions: attractionsByDayId.get(row.id) ?? [],
    connections: connectionsByDayId.get(row.id) ?? [],
  }));

  return { tripId, days };
}
