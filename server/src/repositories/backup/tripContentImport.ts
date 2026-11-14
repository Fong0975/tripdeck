import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import { createLogger } from '../../logger';
import type { TripBackupData } from '../../types/backup';
import type { AttractionResponse, DayResponse } from '../../types/trip';
import { bulkInsert } from '../../utils/bulkInsert';
import * as imageRepo from '../imageRepository';

import { type PendingImage, toPendingImages } from './pendingImages';
import { consistencyError, toGeoColumns } from './tripImportHelpers';

const logger = createLogger('backup');

/** Old (backup) ID -> newly-inserted ID. */
type IdMap = Map<number, number>;

/**
 * Inserts the trip row itself.
 *
 * @param conn - Connection with an open transaction.
 * @param trip - The trip from the backup.
 * @param title - The (de-duplicated) title for the new trip.
 * @returns The new trip's ID.
 */
export async function insertTrip(
  conn: PoolConnection,
  trip: TripBackupData['trip'],
  title: string,
): Promise<number> {
  const [tripResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO trips (title, destination, start_date, end_date, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      trip.destination,
      trip.startDate,
      trip.endDate,
      trip.description,
      new Date(),
    ],
  );
  return tripResult.insertId;
}

/**
 * Inserts one attraction row (its reference websites are batched by the
 * caller).
 *
 * @returns The new attraction's ID.
 */
async function insertAttraction(
  conn: PoolConnection,
  newDayId: number,
  attraction: AttractionResponse,
): Promise<number> {
  const [attractionResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO trip_attractions
       (trip_day_id, name, google_map_url, notes, nearby_attractions, start_time, end_time, sort_order,
        latitude, longitude, geo_source, geo_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newDayId,
      attraction.name,
      attraction.googleMapUrl,
      attraction.notes,
      attraction.nearbyAttractions,
      attraction.startTime,
      attraction.endTime,
      attraction.sortOrder,
      ...toGeoColumns(attraction),
    ],
  );
  return attractionResult.insertId;
}

/**
 * Inserts one day with its locations and attractions (connections are left
 * for the second pass), recording new attraction IDs in `attractionIdMap`.
 *
 * Days and attractions are inserted one row at a time because their new IDs
 * are needed for child rows; the leaf rows (locations, reference websites)
 * are each sent as a single multi-row insert per day.
 *
 * @returns The new day's ID and the pending images of the day and its
 *   attractions.
 */
async function insertDay(
  conn: PoolConnection,
  newTripId: number,
  day: DayResponse,
  attractionIdMap: IdMap,
): Promise<{ newDayId: number; pendingImages: PendingImage[] }> {
  const [dayResult] = await conn.execute<ResultSetHeader>(
    'INSERT INTO trip_days (trip_id, day, date, notes) VALUES (?, ?, ?, ?)',
    [newTripId, day.day, day.date, day.notes],
  );
  const newDayId = dayResult.insertId;
  const pendingImages = toPendingImages(
    day.images,
    newDayId,
    imageRepo.addDayImage,
  );

  await bulkInsert(
    conn,
    'trip_day_locations',
    ['trip_day_id', 'name', 'sort_order'],
    day.locations.map((location, i) => [newDayId, location.name, i]),
  );

  const websiteRows: unknown[][] = [];
  for (const attraction of day.attractions) {
    const newAttractionId = await insertAttraction(conn, newDayId, attraction);
    attractionIdMap.set(attraction.id, newAttractionId);
    for (const site of attraction.referenceWebsites) {
      websiteRows.push([newAttractionId, site.url, site.title]);
    }
    pendingImages.push(
      ...toPendingImages(
        attraction.images,
        newAttractionId,
        imageRepo.addAttractionImage,
      ),
    );
  }
  await bulkInsert(
    conn,
    'trip_attraction_websites',
    ['trip_attraction_id', 'url', 'title'],
    websiteRows,
  );
  return { newDayId, pendingImages };
}

/**
 * Inserts one day's connections using the remapped day and attraction IDs.
 *
 * @returns The pending images of the inserted connections.
 * @throws {TripImportDataError} When the day or a referenced attraction was
 *   not imported.
 */
async function insertDayConnections(
  conn: PoolConnection,
  originalTripId: number,
  day: DayResponse,
  dayIdMap: IdMap,
  attractionIdMap: IdMap,
): Promise<PendingImage[]> {
  const newDayId = dayIdMap.get(day.id);
  if (newDayId === undefined) {
    throw consistencyError(
      originalTripId,
      `Day ${day.id} was not imported before its connections`,
    );
  }

  const pendingImages: PendingImage[] = [];
  for (const connection of day.connections) {
    const newFromId = attractionIdMap.get(connection.fromAttractionId);
    const newToId = attractionIdMap.get(connection.toAttractionId);
    if (newFromId === undefined || newToId === undefined) {
      throw consistencyError(
        originalTripId,
        `Connection ${connection.id} references an attraction that was not imported`,
      );
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
    pendingImages.push(
      ...toPendingImages(
        connection.images,
        connectionResult.insertId,
        imageRepo.addConnectionImage,
      ),
    );
  }
  return pendingImages;
}

/**
 * Inserts a trip's days, locations, attractions (+ reference websites) and
 * connections under `newTripId`, remapping every old ID as it goes.
 *
 * Attractions are inserted before connections in a dedicated second pass:
 * `trip_connections.trip_attraction_id_from/_to` has no `ON DELETE` clause
 * (MySQL defaults to RESTRICT), which also blocks inserting a connection
 * that references an attraction row that does not exist yet.
 *
 * @param conn - Connection with an open transaction.
 * @param data - The trip's backup data.
 * @param newTripId - The newly-inserted trip's ID.
 * @returns Images to write once the transaction commits, in insert order.
 * @throws {TripImportDataError} When a connection references a day or
 *   attraction that was not imported.
 */
export async function importTripContent(
  conn: PoolConnection,
  data: TripBackupData,
  newTripId: number,
): Promise<PendingImage[]> {
  const dayIdMap: IdMap = new Map();
  const attractionIdMap: IdMap = new Map();
  const pendingImages: PendingImage[] = [];

  for (const day of data.content.days) {
    const inserted = await insertDay(conn, newTripId, day, attractionIdMap);
    dayIdMap.set(day.id, inserted.newDayId);
    pendingImages.push(...inserted.pendingImages);
  }

  logger.debug('Importing connections (second pass)', {
    originalTripId: data.trip.id,
    dayCount: data.content.days.length,
  });
  for (const day of data.content.days) {
    pendingImages.push(
      ...(await insertDayConnections(
        conn,
        data.trip.id,
        day,
        dayIdMap,
        attractionIdMap,
      )),
    );
  }
  return pendingImages;
}
