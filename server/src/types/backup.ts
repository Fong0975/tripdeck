import type { TripChecklistResponse } from './checklist';
import type { ImageResponse, TripContentResponse } from './trip';

/** Currently the only supported backup format version. */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupManifest {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  tripCount: number;
  trips: BackupManifestTripEntry[];
}

export interface BackupManifestTripEntry {
  originalTripId: number;
  /** Folder name under `trips/` in the zip, e.g. "trip_12". */
  folder: string;
  title: string;
}

/**
 * Everything needed to recreate one trip as a new trip on import.
 * Reuses the existing API response shapes verbatim (rather than a
 * backup-specific structure) since they already carry every entity's
 * original numeric ID nested in place — exactly what import-time
 * old-ID -> new-ID remapping needs.
 */
export interface TripBackupData {
  trip: {
    id: number;
    title: string;
    destination: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    images: ImageResponse[];
  };
  content: TripContentResponse;
  /** Null when the trip's checklist was never initialized. */
  checklist: TripChecklistResponse | null;
}
