/**
 * Transport modes a travel connection may use. The client keys its
 * `TRANSPORT_MODE_META` lookup by these values.
 */
export const TRANSPORT_MODES = [
  'walk',
  'transit',
  'drive',
  'bike',
  'taxi',
  'flight',
  'other',
] as const;

/** One of the supported {@link TRANSPORT_MODES}. */
export type TransportMode = (typeof TRANSPORT_MODES)[number];

/**
 * How an attraction's stored coordinates were obtained: parsed from its
 * Google Maps link (`url`), looked up by name (`geocode`), or neither lookup
 * found a location (`not_found`).
 */
export const GEO_SOURCES = ['url', 'geocode', 'not_found'] as const;

/** One of the {@link GEO_SOURCES}. */
export type GeoSource = (typeof GEO_SOURCES)[number];

/**
 * Image MIME types accepted for uploads. The server additionally verifies
 * each file's magic bytes against the declared type.
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/** One of the accepted {@link IMAGE_MIME_TYPES}. */
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

/** Maximum size of a single uploaded image file, in bytes (10 MB). */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Maximum size of an uploaded backup zip, in bytes (300 MB). Much larger
 * than an image since one zip can bundle many trips' worth of images.
 */
export const MAX_BACKUP_UPLOAD_BYTES = 300 * 1024 * 1024;

/**
 * Maximum character lengths (counted by code point, as MySQL utf8mb4
 * VARCHAR does) of the user-entered fields stored in VARCHAR columns.
 */
export const FIELD_LIMITS = {
  /** Trip title / destination, attraction, location and checklist names, image and website titles. */
  name: 255,
  /** Checklist `storage_location`. */
  storageLocation: 255,
  /** Attraction `startTime` / `endTime`. */
  time: 10,
  /** Connection `duration`. */
  duration: 100,
} as const;
