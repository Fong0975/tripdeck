import type { GeoSource } from './constants';
import type { UploadedImage } from './image';

/** An external web page linked from an attraction. */
export interface ReferenceWebsite {
  url: string;
  title: string;
}

/** One attraction (stop) of a trip day, as returned by the API. */
export interface Attraction {
  id: number;
  name: string;
  googleMapUrl: string | null;
  notes: string | null;
  nearbyAttractions: string | null;
  startTime: string | null;
  endTime: string | null;
  /** In insertion order; empty when there are none. */
  referenceWebsites: ReferenceWebsite[];
  images: UploadedImage[];
  /** Position within the day; attractions are returned in this order. */
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
  /** Null until the server has tried to resolve the coordinates. */
  geoSource: GeoSource | null;
}

/** Request body of `POST /api/trips/:tripId/days/:dayId/attractions`. */
export interface CreateAttractionBody {
  name: string;
  googleMapUrl?: string;
  notes?: string;
  nearbyAttractions?: string;
  startTime?: string;
  endTime?: string;
  referenceWebsites?: ReferenceWebsite[];
}

/**
 * Request body of `PUT /api/trips/:tripId/attractions/:attractionId`. Only
 * the fields present are changed; `null` clears a field.
 */
export interface UpdateAttractionBody {
  name?: string;
  googleMapUrl?: string | null;
  notes?: string | null;
  nearbyAttractions?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /** Replaces the whole list when present. */
  referenceWebsites?: ReferenceWebsite[];
}

/** Request body of `PATCH /api/trips/:tripId/days/:dayId/attractions/order`. */
export interface ReorderAttractionsBody {
  /** Every attraction id of the day, in the new order. */
  orderedIds: number[];
}

/** Request body of `PATCH /api/trips/:tripId/attractions/:attractionId/move`. */
export interface MoveAttractionBody {
  /** Target day. */
  dayId: number;
  /** 0-based position in the target day; the server clamps it. */
  index: number;
}
