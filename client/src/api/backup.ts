import type { ImportBackupResult } from '@/types';

import { apiBlob, apiJson, json } from './client';

/** Downloads a backup zip containing the given trips' full data and images. */
export async function exportTripsBackup(tripIds: number[]): Promise<Blob> {
  return apiBlob('/api/trips/export', {
    method: 'POST',
    ...json({ tripIds }),
  });
}

/**
 * Uploads a backup zip and imports every trip it contains as a new trip.
 * Rejects with an `ApiError` (see `@/api/client`) when the file fails
 * validation; its `details` carries which trips are missing which images.
 */
export async function importTripsBackup(
  file: File,
): Promise<ImportBackupResult> {
  const form = new FormData();
  form.append('file', file);
  return apiJson<ImportBackupResult>('/api/trips/import', {
    method: 'POST',
    body: form,
  });
}
