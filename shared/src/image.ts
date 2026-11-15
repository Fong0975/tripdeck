/**
 * An uploaded image attached to a trip, day, attraction or connection. The
 * file itself is served at `/uploads/<filename>`.
 */
export interface UploadedImage {
  id: number;
  /** Stored, server-generated filename (UUID plus extension). */
  filename: string;
  /** User-entered display title. */
  title: string;
}
