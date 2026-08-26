/** Thrown when an export is requested for a trip ID that does not exist. */
export class TripNotFoundError extends Error {
  constructor(public readonly tripId: number) {
    super(`Trip ${tripId} not found`);
    this.name = 'TripNotFoundError';
  }
}

/**
 * Thrown when a backup zip fails structural or completeness validation
 * (corrupt/unreadable archive, unsupported format version, missing
 * data.json, or images referenced in a trip's data that are absent from
 * the archive). `details` carries structured information for the client
 * (e.g. which trips are missing which image files) when available.
 */
export class BackupValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BackupValidationError';
  }
}
