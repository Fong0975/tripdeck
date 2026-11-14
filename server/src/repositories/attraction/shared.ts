import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import pool from '../../config/database';
import type { GeoSource } from '../../maps/geoKey';
import type {
  AttractionResponse,
  ImageResponse,
  ReferenceWebsite,
} from '../../types/trip';

// --- Row types ---

export interface TripAttractionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  name: string;
  google_map_url: string | null;
  notes: string | null;
  nearby_attractions: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
  geo_source: GeoSource | null;
  geo_key: string | null;
}

export interface TripAttractionWebsiteRow extends RowDataPacket {
  id: number;
  trip_attraction_id: number;
  url: string;
  title: string;
}

export interface TripConnectionAdjacencyRow extends RowDataPacket {
  id: number;
  trip_attraction_id_from: number;
  trip_attraction_id_to: number;
}

export interface TripConnectionIdRow extends RowDataPacket {
  id: number;
}

// --- Helpers ---

/**
 * Fetches an attraction's reference websites in insertion order.
 *
 * @param attractionId - Attraction to look up.
 * @returns The attraction's websites.
 */
export async function getWebsites(
  attractionId: number,
): Promise<ReferenceWebsite[]> {
  const [rows] = await pool.execute<TripAttractionWebsiteRow[]>(
    'SELECT url, title FROM trip_attraction_websites WHERE trip_attraction_id = ? ORDER BY id',
    [attractionId],
  );
  return rows.map(r => ({ url: r.url, title: r.title }));
}

/**
 * Inserts one trip_attraction_websites row per website, in order.
 *
 * @param conn - Connection (usually inside a transaction) to insert with.
 * @param attractionId - Attraction the websites belong to.
 * @param websites - Websites to insert.
 */
export async function insertWebsites(
  conn: PoolConnection,
  attractionId: number,
  websites: ReferenceWebsite[],
): Promise<void> {
  for (const site of websites) {
    await conn.execute(
      'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
      [attractionId, site.url, site.title],
    );
  }
}

/**
 * Maps a trip_attractions row to its API response shape.
 *
 * @param row - Raw attraction row.
 * @param referenceWebsites - The attraction's reference websites.
 * @param images - The attraction's images.
 * @returns The attraction response.
 */
export function toAttractionResponse(
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
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    geoSource: row.geo_source ?? null,
  };
}
