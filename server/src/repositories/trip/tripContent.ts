import pool from '../../config/database';
import type {
  AttractionResponse,
  ConnectionResponse,
  DayLocation,
  DayResponse,
  ReferenceWebsite,
  TripContentResponse,
} from '../../types/trip';
import * as imageRepo from '../imageRepository';

import { placeholders, toDateString } from './helpers';
import { findById } from './tripCrud';
import {
  TripAttractionRow,
  TripAttractionWebsiteRow,
  TripConnectionRow,
  TripDayLocationRow,
  TripDayRow,
} from './types';

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

  const [locationRows] = await pool.execute<TripDayLocationRow[]>(
    `SELECT * FROM trip_day_locations WHERE trip_day_id IN (${dayPh}) ORDER BY trip_day_id, sort_order`,
    dayIds,
  );

  // Batch-fetch images for attractions and connections.
  const attrIds = attractionRows.map(r => r.id);
  const connIds = connectionRows.map(r => r.id);
  const [imagesByAttractionId, imagesByConnectionId] = await Promise.all([
    imageRepo.getAttractionImagesBatch(attrIds),
    imageRepo.getConnectionImagesBatch(connIds),
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
    locations: locationsByDayId.get(row.id) ?? [],
    attractions: attractionsByDayId.get(row.id) ?? [],
    connections: connectionsByDayId.get(row.id) ?? [],
  }));

  return { tripId, days };
}
