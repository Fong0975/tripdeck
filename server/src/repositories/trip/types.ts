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
  notes: string | null;
}

export interface TripDayLocationRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  name: string;
  sort_order: number;
}
