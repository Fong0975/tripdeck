import type { RowDataPacket } from 'mysql2';

export interface TripRow extends RowDataPacket {
  id: number;
  title: string;
  destination: string | null;
  start_date: Date | string;
  end_date: Date | string;
  description: string | null;
  created_at: Date | string;
}

export interface TripDayRow extends RowDataPacket {
  id: number;
  trip_id: number;
  day: number;
  date: Date | string;
}

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

export interface TripConnectionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  trip_attraction_id_from: number;
  trip_attraction_id_to: number;
  transport_mode: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
}

export interface TripDayLocationRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  name: string;
  sort_order: number;
}
