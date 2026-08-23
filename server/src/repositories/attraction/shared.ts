import type { RowDataPacket } from 'mysql2';

import pool from '../../config/database';
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

export async function getWebsites(
  attractionId: number,
): Promise<ReferenceWebsite[]> {
  const [rows] = await pool.execute<TripAttractionWebsiteRow[]>(
    'SELECT url, title FROM trip_attraction_websites WHERE trip_attraction_id = ? ORDER BY id',
    [attractionId],
  );
  return rows.map(r => ({ url: r.url, title: r.title }));
}

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
  };
}
