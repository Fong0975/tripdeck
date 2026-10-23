import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTrip } from '../../test-utils/fixtures';

import { buildBackupZip } from './backupExport';
import { buildSystemBackupZip } from './systemBackup';

const mockFindAll = vi.fn();

vi.mock('../trip', () => ({
  findAll: (...args: unknown[]) => mockFindAll(...args),
}));

vi.mock('./backupExport', () => ({
  buildBackupZip: vi.fn(),
}));

describe('buildSystemBackupZip', () => {
  beforeEach(() => {
    vi.mocked(buildBackupZip).mockResolvedValue(Buffer.from('zip-bytes'));
  });

  it.each([
    {
      label: 'every trip id',
      trips: [makeTrip({ id: 1 }), makeTrip({ id: 2 })],
      expectedIds: [1, 2],
    },
    {
      label: 'an empty id list when there are no trips',
      trips: [],
      expectedIds: [],
    },
  ])(
    'builds the backup zip with $label and the template included',
    async ({ trips, expectedIds }) => {
      mockFindAll.mockResolvedValue(trips);

      const result = await buildSystemBackupZip();

      expect(buildBackupZip).toHaveBeenCalledWith(expectedIds, {
        includeTemplate: true,
      });
      expect(result).toEqual(Buffer.from('zip-bytes'));
    },
  );
});
