import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/backup', async () => {
  const actual = await vi.importActual<
    typeof import('../../repositories/backup')
  >('../../repositories/backup');
  return {
    ...actual,
    buildBackupZip: vi.fn(),
  };
});

import * as backupRepo from '../../repositories/backup';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import { exportTrips } from './backupController';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportTrips', () => {
  it.each([
    { name: 'tripIds is missing', body: {} },
    { name: 'tripIds is not an array', body: { tripIds: 1 } },
    { name: 'tripIds is an empty array', body: { tripIds: [] } },
    { name: 'tripIds contains a non-integer', body: { tripIds: [1, 1.5] } },
    {
      name: 'tripIds contains a non-positive integer',
      body: { tripIds: [1, 0] },
    },
  ])('returns 400 when $name', async ({ body }) => {
    const { req, res } = createMockReqRes({ body });

    await exportTrips(req, res);

    expectJsonStatus(res, 400, {
      error: 'tripIds must be a non-empty array of positive integers',
    });
    expect(backupRepo.buildBackupZip).not.toHaveBeenCalled();
  });

  it('streams the zip buffer with the correct headers on success', async () => {
    const zipBuffer = Buffer.from('zip-bytes');
    vi.mocked(backupRepo.buildBackupZip).mockResolvedValue(zipBuffer);
    const { req, res } = createMockReqRes({ body: { tripIds: [1, 2] } });

    await exportTrips(req, res);

    expect(backupRepo.buildBackupZip).toHaveBeenCalledWith([1, 2]);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringMatching(/^attachment; filename="tripdeck-backup-.*\.zip"$/),
    );
    expect(res.send).toHaveBeenCalledWith(zipBuffer);
  });

  it('returns 404 with the error message when a trip is not found', async () => {
    vi.mocked(backupRepo.buildBackupZip).mockRejectedValue(
      new backupRepo.TripNotFoundError(5),
    );
    const { req, res } = createMockReqRes({ body: { tripIds: [5] } });

    await exportTrips(req, res);

    expectJsonStatus(res, 404, { error: 'Trip 5 not found' });
  });

  it('returns 500 on an unexpected error', async () => {
    vi.mocked(backupRepo.buildBackupZip).mockRejectedValue(
      new Error('unexpected'),
    );
    const { req, res } = createMockReqRes({ body: { tripIds: [1] } });

    await exportTrips(req, res);

    expectJsonStatus(res, 500, { error: 'Failed to export trips' });
  });
});
