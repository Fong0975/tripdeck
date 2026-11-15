import type { UploadedImage } from '@tripdeck/shared';

import type { TripBackupData } from '../../types/backup';

/**
 * Zip path of one trip's `data.json`.
 *
 * @param folder - The trip's folder under `trips/`, e.g. "trip_12".
 * @returns e.g. `trips/trip_12/data.json`.
 */
export function tripDataPath(folder: string): string {
  return `trips/${folder}/data.json`;
}

/**
 * Zip path of one image file of a trip.
 *
 * @param folder - The trip's folder under `trips/`, e.g. "trip_12".
 * @param filename - The image's stored filename.
 * @returns e.g. `trips/trip_12/images/abc.jpg`.
 */
export function tripImagePath(folder: string, filename: string): string {
  return `trips/${folder}/images/${filename}`;
}

/**
 * Collects every image referenced anywhere in a trip's backup data
 * (trip-level, day-level, attraction-level, connection-level).
 *
 * @param data - One trip's backup data.
 * @returns The images, trip-level first, then per day in document order.
 */
export function collectTripImages(data: TripBackupData): UploadedImage[] {
  const images: UploadedImage[] = [...data.trip.images];
  for (const day of data.content.days) {
    images.push(...day.images);
    for (const attraction of day.attractions) {
      images.push(...attraction.images);
    }
    for (const connection of day.connections) {
      images.push(...connection.images);
    }
  }
  return images;
}
