import type { TransportMode } from './constants';
import type { UploadedImage } from './image';

/** A travel leg between two attractions of the same day. */
export interface TravelConnection {
  id: number;
  fromAttractionId: number;
  toAttractionId: number;
  /**
   * Null when the stored value is missing or not a known
   * {@link TransportMode} (possible for legacy or imported data).
   */
  transportMode: TransportMode | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
  images: UploadedImage[];
}

/** Request body of `POST /api/trips/:tripId/days/:dayId/connections`. */
export interface CreateConnectionBody {
  fromAttractionId: number;
  toAttractionId: number;
  transportMode: TransportMode;
  duration?: string;
  route?: string;
  notes?: string;
}

/**
 * Request body of `PUT /api/trips/:tripId/connections/:connectionId`. Only
 * the fields present are changed; `null` clears a field.
 */
export interface UpdateConnectionBody {
  fromAttractionId?: number;
  toAttractionId?: number;
  transportMode?: TransportMode;
  duration?: string | null;
  route?: string | null;
  notes?: string | null;
}
