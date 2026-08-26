import type { AutoBackupFileInfo, ImportBackupResult } from '@/types';

import { apiBlob, apiJson, apiUrl, json } from './client';

/**
 * Downloads a backup zip containing the given trips' full data and images.
 * `includeTemplate` additionally adds a snapshot of the global packing
 * checklist template to the zip.
 */
export async function exportTripsBackup(
  tripIds: number[],
  includeTemplate: boolean,
): Promise<Blob> {
  return apiBlob('/api/trips/export', {
    method: 'POST',
    ...json({ tripIds, includeTemplate }),
  });
}

/**
 * Uploads a backup zip and imports every trip it contains as a new trip.
 * Rejects with an `ApiError` (see `@/api/client`) when the file fails
 * validation; its `details` carries which trips are missing which images.
 * `restoreTemplate` additionally replaces the global packing checklist
 * template when the backup contains one (ignored otherwise).
 */
export async function importTripsBackup(
  file: File,
  restoreTemplate: boolean,
): Promise<ImportBackupResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('restoreTemplate', String(restoreTemplate));
  return apiJson<ImportBackupResult>('/api/trips/import', {
    method: 'POST',
    body: form,
  });
}

/** Lists every automatic backup currently on disk, newest first. */
export async function listAutoBackups(): Promise<AutoBackupFileInfo[]> {
  return apiJson<AutoBackupFileInfo[]>('/api/backups');
}

/** Builds the direct download URL for one automatic backup file. */
export function getAutoBackupDownloadUrl(filename: string): string {
  return apiUrl(`/api/backups/${encodeURIComponent(filename)}`);
}
