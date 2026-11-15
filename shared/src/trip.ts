import type { Attraction } from './attraction';
import type { TravelConnection } from './connection';
import type { UploadedImage } from './image';

/** A trip's summary record, as returned by the trip CRUD endpoints. */
export interface Trip {
  id: number;
  title: string;
  destination: string | null;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`. */
  endDate: string;
  description: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Trip-level images; empty when there are none. */
  images: UploadedImage[];
}

/** A named location (e.g. city) a trip day visits. */
export interface DayLocation {
  id: number;
  name: string;
}

/** One day of a trip's itinerary with everything planned on it. */
export interface DayPlan {
  id: number;
  /** 1-based day number within the trip. */
  day: number;
  /** `YYYY-MM-DD`. */
  date: string;
  notes: string | null;
  locations: DayLocation[];
  /** Ordered by {@link Attraction.sortOrder}. */
  attractions: Attraction[];
  connections: TravelConnection[];
  images: UploadedImage[];
}

/** Response of `GET /api/trips/:tripId/content`. */
export interface TripContent {
  tripId: number;
  /** Ordered by day number. */
  days: DayPlan[];
}

/** Response of `PUT /api/trips/:tripId/days/:dayId/notes`. */
export interface DayNotes {
  /** The day's id. */
  id: number;
  notes: string | null;
}

/** Request body of `POST /api/trips`. */
export interface CreateTripBody {
  title: string;
  destination?: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`. */
  endDate: string;
  description?: string;
}

/**
 * Request body of `PUT /api/trips/:id`. Only the fields present are
 * changed; `null` clears a field.
 */
export interface UpdateTripBody {
  title?: string;
  destination?: string | null;
  startDate?: string;
  endDate?: string;
  description?: string | null;
}

/**
 * Request body for creating (`POST .../days/:dayId/locations`) or renaming
 * (`PUT .../locations/:locationId`) a day location.
 */
export interface DayLocationBody {
  name: string;
}

/** Request body of `PUT /api/trips/:tripId/days/:dayId/notes`. */
export interface UpdateDayNotesBody {
  notes?: string | null;
}
