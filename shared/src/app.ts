/** JSON body of every non-2xx API response. */
export interface ApiErrorBody {
  /** Client-facing error message. */
  error: string;
  /** Endpoint-specific structured detail (e.g. `ImportBackupErrorDetails`). */
  details?: unknown;
}

/** Response of `GET /api/fetch-title`. */
export interface PageTitleResult {
  /** The raw (possibly HTML-entity-encoded) page title; null when the page has none. */
  title: string | null;
}
