import type { ResultSetHeader } from 'mysql2';

import pool from '../../config/database';
import type { CreateTripBody, TripResponse } from '../../types/trip';

import { getDatesInRange, toDateString, toTripResponse } from './helpers';
import { TripDayRow, TripRow } from './types';

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
