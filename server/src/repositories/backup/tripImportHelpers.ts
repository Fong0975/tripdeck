import type { RowDataPacket } from 'mysql2';

import pool from '../../config/database';
import { createLogger } from '../../logger';
import { computeGeoKey, isGeoSource, type GeoSource } from '../../maps/geoKey';
import type { AttractionResponse } from '../../types/trip';

import { TripImportDataError } from './errors';

const logger = createLogger('backup');

/**
 * Returns `desiredTitle` unchanged if no trip already uses it, otherwise
 * appends the lowest available " (n)" suffix (starting at 2).
 *
 * @param desiredTitle - The title the imported trip should ideally get.
 * @returns A title no existing trip uses.
 */
export async function generateUniqueTripTitle(
  desiredTitle: string,
): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT title FROM trips');
  const existingTitles = new Set(
    rows.map(row => (row as { title: string }).title),
  );

  if (!existingTitles.has(desiredTitle)) {
    return desiredTitle;
  }

  let suffix = 2;
  while (existingTitles.has(`${desiredTitle} (${suffix})`)) {
    suffix++;
  }
  const resolvedTitle = `${desiredTitle} (${suffix})`;
  logger.debug('Resolved a title collision during import', {
    desiredTitle,
    resolvedTitle,
  });
  return resolvedTitle;
}

/**
 * Maps an imported attraction's geo fields to [latitude, longitude, geo_source, geo_key].
 * Backups created before geo support, or with malformed values, import as
 * unresolved (all null) so the coordinates are re-derived on demand.
 *
 * @param attraction - Attraction from the backup; geo fields may be absent.
 * @returns The four geo column values, in insert order.
 */
export function toGeoColumns(
  attraction: Partial<AttractionResponse> & {
    name: string;
    googleMapUrl: string | null;
  },
): [number | null, number | null, GeoSource | null, string | null] {
  const { latitude, longitude, geoSource } = attraction;
  if (!isGeoSource(geoSource)) {
    return [null, null, null, null];
  }
  const geoKey = computeGeoKey(attraction.name, attraction.googleMapUrl);
  if (geoSource === 'not_found') {
    return [null, null, geoSource, geoKey];
  }
  if (
    typeof latitude !== 'number' ||
    !(Math.abs(latitude) <= 90) ||
    typeof longitude !== 'number' ||
    !(Math.abs(longitude) <= 180)
  ) {
    return [null, null, null, null];
  }
  return [latitude, longitude, geoSource, geoKey];
}

/**
 * Logs and builds the error for backup data that passed structural
 * validation but is internally inconsistent (e.g. a dangling reference).
 *
 * @param originalTripId - The trip's ID in the backup, for the log entry.
 * @param message - A user-safe description built only from backup IDs.
 * @returns The error for the caller to throw.
 */
export function consistencyError(
  originalTripId: number,
  message: string,
): TripImportDataError {
  logger.error('Trip import consistency error', { originalTripId, message });
  return new TripImportDataError(message);
}
