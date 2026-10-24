import { createHash } from 'crypto';

/** How an attraction's stored coordinates were obtained. */
export type GeoSource = 'url' | 'geocode' | 'not_found';

export const GEO_SOURCES: readonly GeoSource[] = [
  'url',
  'geocode',
  'not_found',
];

/**
 * Fingerprint of the inputs that determine an attraction's coordinates.
 * Stored next to the coordinates so a later name or link edit is detected
 * without re-querying Google.
 *
 * @param name - Attraction name.
 * @param googleMapUrl - Free-text Google Maps link, if any.
 * @returns A 64-character hex SHA-256 digest.
 */
export function computeGeoKey(
  name: string,
  googleMapUrl: string | null | undefined,
): string {
  const normalized = JSON.stringify([
    name.trim().toLowerCase(),
    (googleMapUrl ?? '').trim(),
  ]);
  return createHash('sha256').update(normalized).digest('hex');
}

/** Narrows an untrusted value (e.g. imported backup data) to a GeoSource. */
export function isGeoSource(value: unknown): value is GeoSource {
  return GEO_SOURCES.includes(value as GeoSource);
}
