/** Request body of `POST /api/trips/export`. */
export interface ExportBackupBody {
  /** Trips to include; may be empty when only the template is exported. */
  tripIds: number[];
  /** Also include a snapshot of the global packing checklist template. */
  includeTemplate?: boolean;
}

/** One trip from a backup that was successfully imported as a new trip. */
export interface ImportedTripResult {
  originalTripId: number;
  newTripId: number;
  /** The (possibly de-duplicated) title the new trip was created with. */
  title: string;
}

/** One trip from a backup that failed to import. */
export interface FailedTripResult {
  originalTripId: number;
  title: string;
  error: string;
}

/**
 * Response of `POST /api/trips/import`. Each trip is imported
 * independently, so one failing does not prevent the others.
 */
export interface ImportBackupResult {
  imported: ImportedTripResult[];
  failed: FailedTripResult[];
  /**
   * True only when template restoration was requested and the backup
   * actually contained a template snapshot to restore.
   */
  templateRestored: boolean;
}

/** One trip of an uploaded backup whose image files are missing from the zip. */
export interface MissingBackupImages {
  /** Folder name under `trips/` in the zip, e.g. "trip_12". */
  folder: string;
  title: string;
  missingFilenames: string[];
}

/**
 * The `details` of the 400 error `POST /api/trips/import` returns when the
 * zip references image files it does not contain.
 */
export interface ImportBackupErrorDetails {
  trips: MissingBackupImages[];
}

/** One automatic backup file, as listed/downloaded via `/api/backups`. */
export interface AutoBackupFileInfo {
  filename: string;
  sizeBytes: number;
  /** The file's last-modified time, as an ISO 8601 string. */
  createdAt: string;
}
