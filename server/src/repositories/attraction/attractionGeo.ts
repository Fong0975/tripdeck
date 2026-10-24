import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import type { GeoSource } from '../../maps/geoKey';

export interface AttractionGeoRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  name: string;
  google_map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  geo_source: GeoSource | null;
  geo_key: string | null;
}

export interface GeoUpdate {
  latitude: number | null;
  longitude: number | null;
  geoSource: GeoSource;
  geoKey: string;
}

/** Returns every attraction of a trip with the fields needed to resolve its location. */
export async function findGeoRowsForTrip(
  tripId: number,
): Promise<AttractionGeoRow[]> {
  const [rows] = await pool.execute<AttractionGeoRow[]>(
    `SELECT ta.id, ta.trip_day_id, ta.name, ta.google_map_url,
            ta.latitude, ta.longitude, ta.geo_source, ta.geo_key
     FROM trip_attractions ta
     JOIN trip_days td ON td.id = ta.trip_day_id
     WHERE td.trip_id = ?
     ORDER BY td.day, ta.sort_order`,
    [tripId],
  );
  return rows;
}

/**
 * Stores a resolved location. The write only applies while the attraction
 * still has the name and link the lookup was based on, so a concurrent edit is
 * never overwritten by a result for outdated input.
 *
 * @returns Whether a row was updated.
 */
export async function saveGeo(
  row: Pick<AttractionGeoRow, 'id' | 'name' | 'google_map_url'>,
  geo: GeoUpdate,
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE trip_attractions
     SET latitude = ?, longitude = ?, geo_source = ?, geo_key = ?
     WHERE id = ? AND name = ? AND google_map_url <=> ?`,
    [
      geo.latitude,
      geo.longitude,
      geo.geoSource,
      geo.geoKey,
      row.id,
      row.name,
      row.google_map_url,
    ],
  );
  return result.affectedRows > 0;
}
