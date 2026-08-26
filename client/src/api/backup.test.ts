import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportTripsBackup } from './backup';
import { apiBlob, json } from './client';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, apiBlob: vi.fn() };
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
