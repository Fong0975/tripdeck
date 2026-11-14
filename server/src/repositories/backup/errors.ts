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

/**
 * Thrown while importing a single trip when its (structurally valid) backup
 * data is internally inconsistent, e.g. a connection or checklist check that
 * references an entity missing from the backup, or an image referenced by
 * the data whose bytes were not supplied. The message is composed only from
 * IDs and filenames taken from the backup itself, so it is safe to return to
 * the client.
 */
export class TripImportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TripImportDataError';
  }
}

/** Client-facing message for a trip import failure whose cause is not safe to expose. */
export const GENERIC_IMPORT_ERROR_MESSAGE = 'Import failed';

/**
 * Maps an error thrown while importing one trip to a message that is safe to
 * return to the client. Errors raised by backup validation/import logic carry
 * user-safe messages and are passed through; anything else (database errors,
 * filesystem errors, programming errors) collapses to
 * `GENERIC_IMPORT_ERROR_MESSAGE` so raw internals such as SQL text never
 * leak. Callers are expected to log the original error server-side.
 *
 * @param err - The value thrown by the import step.
 * @returns A user-safe error message.
 */
export function toClientImportErrorMessage(err: unknown): string {
  if (
    err instanceof BackupValidationError ||
    err instanceof TripImportDataError
  ) {
    return err.message;
  }
  return GENERIC_IMPORT_ERROR_MESSAGE;
}
