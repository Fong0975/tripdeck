import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportTripsBackup, importTripsBackup } from './backup';
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
  it('uploads the file as multipart form data to the import endpoint', async () => {
    const result = { imported: [], failed: [] };
    vi.mocked(apiJson).mockResolvedValue(result);
    const file = new File(['zip-bytes'], 'backup.zip');

    const response = await importTripsBackup(file);

    expect(apiJson).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(apiJson).mock.calls[0];
    expect(url).toBe('/api/trips/import');
    expect(init?.method).toBe('POST');
    const form = init?.body as FormData;
    expect(form.get('file')).toBe(file);
    expect(response).toBe(result);
  });
});
