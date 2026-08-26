import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  exportTripsBackup,
  getAutoBackupDownloadUrl,
  importTripsBackup,
  listAutoBackups,
} from './backup';
import { apiBlob, apiJson, json } from './client';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, apiBlob: vi.fn(), apiJson: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportTripsBackup', () => {
  it('POSTs the selected trip ids to the export endpoint and resolves with the zip blob', async () => {
    const blob = new Blob(['zip-bytes']);
    vi.mocked(apiBlob).mockResolvedValue(blob);

    const result = await exportTripsBackup([1, 2]);

    expect(apiBlob).toHaveBeenCalledWith('/api/trips/export', {
      method: 'POST',
      ...json({ tripIds: [1, 2] }),
    });
    expect(result).toBe(blob);
  });
});

describe('importTripsBackup', () => {
  it('uploads the file and the restoreTemplate flag as multipart form data', async () => {
    const result = { imported: [], failed: [], templateRestored: true };
    vi.mocked(apiJson).mockResolvedValue(result);
    const file = new File(['zip-bytes'], 'backup.zip');

    const response = await importTripsBackup(file, true);

    expect(apiJson).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(apiJson).mock.calls[0];
    expect(url).toBe('/api/trips/import');
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('restoreTemplate')).toBe('true');
    expect(response).toBe(result);
  });

  it('sends restoreTemplate as "false" when not requested', async () => {
    vi.mocked(apiJson).mockResolvedValue({
      imported: [],
      failed: [],
      templateRestored: false,
    });
    const file = new File(['zip-bytes'], 'backup.zip');

    await importTripsBackup(file, false);

    const [, init] = vi.mocked(apiJson).mock.calls[0];
    const form = init?.body as FormData;
    expect(form.get('restoreTemplate')).toBe('false');
  });
});

describe('listAutoBackups', () => {
  it('fetches the list of automatic backups', async () => {
    const files = [
      {
        filename: 'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
        sizeBytes: 100,
        createdAt: '2026-08-26T00:00:00.000Z',
      },
    ];
    vi.mocked(apiJson).mockResolvedValue(files);

    const result = await listAutoBackups();

    expect(apiJson).toHaveBeenCalledWith('/api/backups');
    expect(result).toBe(files);
  });
});

describe('getAutoBackupDownloadUrl', () => {
  it('builds the download URL for a given filename', () => {
    expect(
      getAutoBackupDownloadUrl(
        'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
      ),
    ).toBe('/api/backups/tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip');
  });
});
