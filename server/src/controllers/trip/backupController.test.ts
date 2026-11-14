import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/backup', async () => {
  const { BackupValidationError, TripNotFoundError } = await vi.importActual<
    typeof import('../../repositories/backup/errors')
  >('../../repositories/backup/errors');
  return {
    BackupValidationError,
    TripNotFoundError,
    buildBackupZip: vi.fn(),
    importBackupZip: vi.fn(),
  };
});

import * as backupRepo from '../../repositories/backup';
import { runExclusive } from '../../repositories/backup/backupLock';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import { exportTrips, importTrips } from './backupController';

describe('exportTrips', () => {
  it.each([
    { name: 'tripIds is not an array', body: { tripIds: 1 } },
    { name: 'tripIds contains a non-integer', body: { tripIds: [1, 1.5] } },
    {
      name: 'tripIds contains a non-positive integer',
      body: { tripIds: [1, 0] },
    },
  ])('returns 400 when $name', async ({ body }) => {
    const { req, res } = createMockReqRes({ body });

    await exportTrips(req, res);

    expectJsonStatus(res, 400, {
      error: 'tripIds must be an array of positive integers',
    });
    expect(backupRepo.buildBackupZip).not.toHaveBeenCalled();
  });

  it('returns 400 when includeTemplate is not a boolean', async () => {
    const { req, res } = createMockReqRes({
      body: { tripIds: [1], includeTemplate: 'true' },
    });

    await exportTrips(req, res);

    expectJsonStatus(res, 400, {
      error: 'includeTemplate must be a boolean',
    });
    expect(backupRepo.buildBackupZip).not.toHaveBeenCalled();
  });

  it('returns 400 when neither a trip nor the template is selected', async () => {
    const { req, res } = createMockReqRes({
      body: { tripIds: [], includeTemplate: false },
    });

    await exportTrips(req, res);

    expectJsonStatus(res, 400, {
      error: 'Select at least one trip or the checklist template to export',
    });
    expect(backupRepo.buildBackupZip).not.toHaveBeenCalled();
  });

  it('allows an empty tripIds array when includeTemplate is true', async () => {
    const zipBuffer = Buffer.from('zip-bytes');
    vi.mocked(backupRepo.buildBackupZip).mockResolvedValue(zipBuffer);
    const { req, res } = createMockReqRes({
      body: { tripIds: [], includeTemplate: true },
    });

    await exportTrips(req, res);

    expect(backupRepo.buildBackupZip).toHaveBeenCalledWith([], {
      includeTemplate: true,
    });
    expect(res.send).toHaveBeenCalledWith(zipBuffer);
  });

  it('streams the zip buffer with the correct headers on success', async () => {
    const zipBuffer = Buffer.from('zip-bytes');
    vi.mocked(backupRepo.buildBackupZip).mockResolvedValue(zipBuffer);
    const { req, res } = createMockReqRes({ body: { tripIds: [1, 2] } });

    await exportTrips(req, res);

    expect(backupRepo.buildBackupZip).toHaveBeenCalledWith([1, 2], {
      includeTemplate: false,
    });
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

  it('passes includeTemplate through when requested alongside trips', async () => {
    const zipBuffer = Buffer.from('zip-bytes');
    vi.mocked(backupRepo.buildBackupZip).mockResolvedValue(zipBuffer);
    const { req, res } = createMockReqRes({
      body: { tripIds: [1], includeTemplate: true },
    });

    await exportTrips(req, res);

    expect(backupRepo.buildBackupZip).toHaveBeenCalledWith([1], {
      includeTemplate: true,
    });
  });

  it('returns 404 with the error message when a trip is not found', async () => {
    vi.mocked(backupRepo.buildBackupZip).mockRejectedValue(
      new backupRepo.TripNotFoundError(5),
    );
    const { req, res } = createMockReqRes({ body: { tripIds: [5] } });

    await exportTrips(req, res);

    expectJsonStatus(res, 404, { error: 'Trip 5 not found' });
  });

  it('rethrows an unexpected error for the error handler', async () => {
    const error = new Error('unexpected');
    vi.mocked(backupRepo.buildBackupZip).mockRejectedValue(error);
    const { req, res } = createMockReqRes({ body: { tripIds: [1] } });

    await expect(exportTrips(req, res)).rejects.toBe(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

const mockZipFile = {
  buffer: Buffer.from('fake-zip-bytes'),
  mimetype: 'application/zip',
} as Express.Multer.File;

describe('importTrips', () => {
  it('returns 400 when no file is uploaded', async () => {
    const { req, res } = createMockReqRes();

    await importTrips(req, res);

    expectJsonStatus(res, 400, { error: 'backup file is required' });
    expect(backupRepo.importBackupZip).not.toHaveBeenCalled();
  });

  it('imports the uploaded buffer and returns the per-trip results', async () => {
    const result = {
      imported: [{ originalTripId: 1, newTripId: 10, title: 'Kyoto Trip' }],
      failed: [],
      templateRestored: false,
    };
    vi.mocked(backupRepo.importBackupZip).mockResolvedValue(result);
    const { req, res } = createMockReqRes({ file: mockZipFile });

    await importTrips(req, res);

    expect(backupRepo.importBackupZip).toHaveBeenCalledWith(
      mockZipFile.buffer,
      { restoreTemplate: false },
    );
    expect(res.json).toHaveBeenCalledWith(result);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes restoreTemplate: true through when the form field is set', async () => {
    const result = {
      imported: [{ originalTripId: 1, newTripId: 10, title: 'Kyoto Trip' }],
      failed: [],
      templateRestored: true,
    };
    vi.mocked(backupRepo.importBackupZip).mockResolvedValue(result);
    const { req, res } = createMockReqRes({
      file: mockZipFile,
      body: { restoreTemplate: 'true' },
    });

    await importTrips(req, res);

    expect(backupRepo.importBackupZip).toHaveBeenCalledWith(
      mockZipFile.buffer,
      { restoreTemplate: true },
    );
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('returns 400 with details when the backup fails validation', async () => {
    const details = {
      trips: [
        { folder: 'trip_1', title: 'Kyoto Trip', missingFilenames: ['a.jpg'] },
      ],
    };
    vi.mocked(backupRepo.importBackupZip).mockRejectedValue(
      new backupRepo.BackupValidationError(
        'Backup file is incomplete',
        details,
      ),
    );
    const { req, res } = createMockReqRes({ file: mockZipFile });

    await importTrips(req, res);

    expectJsonStatus(res, 400, {
      error: 'Backup file is incomplete',
      details,
    });
  });

  it('rethrows an unexpected error for the error handler', async () => {
    const error = new Error('unexpected');
    vi.mocked(backupRepo.importBackupZip).mockRejectedValue(error);
    const { req, res } = createMockReqRes({ file: mockZipFile });

    await expect(importTrips(req, res)).rejects.toBe(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('backup lock', () => {
  const zipFile = {
    buffer: Buffer.from('fake-zip-bytes'),
    mimetype: 'application/zip',
  } as Express.Multer.File;

  it.each([
    {
      name: 'exportTrips',
      run: (req: Request, res: Response) => exportTrips(req, res),
      reqOverrides: { body: { tripIds: [1] } },
      repoFn: () => backupRepo.buildBackupZip,
      arrange: () =>
        vi
          .mocked(backupRepo.buildBackupZip)
          .mockResolvedValue(Buffer.from('zip-bytes')),
    },
    {
      name: 'importTrips',
      run: (req: Request, res: Response) => importTrips(req, res),
      reqOverrides: { file: zipFile },
      repoFn: () => backupRepo.importBackupZip,
      arrange: () =>
        vi.mocked(backupRepo.importBackupZip).mockResolvedValue({
          imported: [],
          failed: [],
          templateRestored: false,
        }),
    },
  ])(
    '$name waits for a running backup operation before starting',
    async ({ run, reqOverrides, repoFn, arrange }) => {
      arrange();
      let releaseLock: () => void = () => undefined;
      const holder = runExclusive(
        () =>
          new Promise<void>(resolve => {
            releaseLock = resolve;
          }),
      );
      const { req, res } = createMockReqRes(reqOverrides);

      const pending = run(req, res);
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
      expect(repoFn()).not.toHaveBeenCalled();

      releaseLock();
      await holder;
      await pending;

      expect(repoFn()).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    },
  );
});
