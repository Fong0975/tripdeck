import { apiBlob, json } from './client';

/** Downloads a backup zip containing the given trips' full data and images. */
export async function exportTripsBackup(tripIds: number[]): Promise<Blob> {
  return apiBlob('/api/trips/export', {
    method: 'POST',
    ...json({ tripIds }),
  });
}
