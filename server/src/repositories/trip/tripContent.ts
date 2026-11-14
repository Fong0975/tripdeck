import pool from '../../config/database';
import { createLogger } from '../../logger';
import type {
  AttractionResponse,
  ConnectionResponse,
  DayLocation,
  DayResponse,
  ReferenceWebsite,
  TripContentResponse,
} from '../../types/trip';
import { placeholders } from '../../utils/sql';
import {
  toAttractionResponse,
  TripAttractionRow,
  TripAttractionWebsiteRow,
} from '../attraction/shared';
import {
  toConnectionResponse,
  TripConnectionRow,
} from '../connectionRepository';
import * as imageRepo from '../imageRepository';

import { toDateString } from './helpers';
import { tripExists } from './tripCrud';
import { TripDayLocationRow, TripDayRow } from './types';

const logger = createLogger('trip');

/**
 * Batch-fetches the reference websites of the given attractions, grouped by
 * attraction id in insertion order. Skips the query when there are none.
 *
 * @param attractionIds - Attractions to look up.
 * @returns Websites keyed by attraction id.
 */
async function getWebsitesByAttractionId(
  attractionIds: number[],
): Promise<Map<number, ReferenceWebsite[]>> {
  const websitesByAttractionId = new Map<number, ReferenceWebsite[]>();
  if (attractionIds.length === 0) {
    return websitesByAttractionId;
  }
  const [websiteRows] = await pool.execute<TripAttractionWebsiteRow[]>(
    `SELECT * FROM trip_attraction_websites
     WHERE trip_attraction_id IN (${placeholders(attractionIds.length)})
     ORDER BY trip_attraction_id, id`,
    attractionIds,
  );
  for (const row of websiteRows) {
    const sites = websitesByAttractionId.get(row.trip_attraction_id) ?? [];
    sites.push({ url: row.url, title: row.title });
    websitesByAttractionId.set(row.trip_attraction_id, sites);
  }
  return websitesByAttractionId;
}

/**
 * Fetches the full trip content: all days with their locations, attractions
 * (including reference websites), connections and images.
 *
 * Uses batched queries to avoid N+1, and runs the ones that do not depend
 * on each other concurrently.
 *
 * @param tripId - Trip to load.
 * @returns The trip's content, or null when the trip does not exist.
 */
export async function findContent(
  tripId: number,
): Promise<TripContentResponse | null> {
  const [exists, [dayRows]] = await Promise.all([
    tripExists(tripId),
    pool.execute<TripDayRow[]>(
      'SELECT * FROM trip_days WHERE trip_id = ? ORDER BY day',
      [tripId],
    ),
  ]);
  if (!exists) {
    return null;
  }

  if (dayRows.length === 0) {
    return { tripId, days: [] };
  }

  const dayIds = dayRows.map(r => r.id);
  const dayPh = placeholders(dayIds.length);

  const [[attractionRows], [connectionRows], [locationRows]] =
    await Promise.all([
      pool.execute<TripAttractionRow[]>(
        `SELECT * FROM trip_attractions
         WHERE trip_day_id IN (${dayPh})
         ORDER BY trip_day_id, sort_order`,
        dayIds,
      ),
      pool.execute<TripConnectionRow[]>(
        `SELECT * FROM trip_connections WHERE trip_day_id IN (${dayPh})`,
        dayIds,
      ),
      pool.execute<TripDayLocationRow[]>(
        `SELECT * FROM trip_day_locations WHERE trip_day_id IN (${dayPh}) ORDER BY trip_day_id, sort_order`,
        dayIds,
      ),
    ]);

  const attrIds = attractionRows.map(r => r.id);
  const connIds = connectionRows.map(r => r.id);
  const [
    websitesByAttractionId,
    imagesByAttractionId,
    imagesByConnectionId,
    imagesByDayId,
  ] = await Promise.all([
    getWebsitesByAttractionId(attrIds),
    imageRepo.getAttractionImagesBatch(attrIds),
    imageRepo.getConnectionImagesBatch(connIds),
    imageRepo.getDayImagesBatch(dayIds),
  ]);

  // Group locations, attractions, and connections by their parent day ID.
  const locationsByDayId = new Map<number, DayLocation[]>();
  for (const row of locationRows) {
    const list = locationsByDayId.get(row.trip_day_id) ?? [];
    list.push({ id: row.id, name: row.name });
    locationsByDayId.set(row.trip_day_id, list);
  }

  const attractionsByDayId = new Map<number, AttractionResponse[]>();
  for (const row of attractionRows) {
    const list = attractionsByDayId.get(row.trip_day_id) ?? [];
    list.push(
      toAttractionResponse(
        row,
        websitesByAttractionId.get(row.id) ?? [],
        imagesByAttractionId.get(row.id) ?? [],
      ),
    );
    attractionsByDayId.set(row.trip_day_id, list);
  }

  const connectionsByDayId = new Map<number, ConnectionResponse[]>();
  for (const row of connectionRows) {
    const list = connectionsByDayId.get(row.trip_day_id) ?? [];
    list.push(
      toConnectionResponse(row, imagesByConnectionId.get(row.id) ?? []),
    );
    connectionsByDayId.set(row.trip_day_id, list);
  }

  const days: DayResponse[] = dayRows.map(row => ({
    id: row.id,
    day: row.day,
    date: toDateString(row.date),
    notes: row.notes,
    locations: locationsByDayId.get(row.id) ?? [],
    attractions: attractionsByDayId.get(row.id) ?? [],
    connections: connectionsByDayId.get(row.id) ?? [],
    images: imagesByDayId.get(row.id) ?? [],
  }));

  logger.debug('Assembled trip content', {
    tripId,
    days: dayRows.length,
    attractions: attractionRows.length,
    connections: connectionRows.length,
  });

  return { tripId, days };
}
