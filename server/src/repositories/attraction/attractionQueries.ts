import type { RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';

import type { TripAttractionRow } from './shared';

const logger = createLogger('attraction');

/**
 * Returns the trip_day_id for a given attraction.
 *
 * @param attractionId - Attraction to look up.
 * @returns The id of the day the attraction belongs to.
 * @throws Error('Attraction not found') when the attraction does not exist.
 */
export async function getDayIdForAttraction(
  attractionId: number,
): Promise<number> {
  const [rows] = await pool.execute<TripAttractionRow[]>(
    'SELECT trip_day_id FROM trip_attractions WHERE id = ?',
    [attractionId],
  );
  if (rows.length === 0) {
    logger.warn('Attraction not found', { attractionId });
    throw new Error('Attraction not found');
  }
  return rows[0].trip_day_id;
}

/**
 * Confirms an attraction is reachable through the given trip's days.
 *
 * @param attractionId - Attraction to check.
 * @param tripId - Trip the attraction must belong to.
 * @returns True when the attraction belongs to the trip.
 */
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
