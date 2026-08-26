import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListAutoBackupFiles = vi.fn();
const mockResolveAutoBackupPath = vi.fn();

vi.mock('../repositories/backup', () => ({
  listAutoBackupFiles: (...args: unknown[]) => mockListAutoBackupFiles(...args),
  resolveAutoBackupPath: (...args: unknown[]) =>
    mockResolveAutoBackupPath(...args),
}));

const mockReadFileSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
}));

import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';

import { downloadAutoBackup, listAutoBackups } from './backupController';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listAutoBackups', () => {
  it('responds with the list of automatic backups', () => {
    const files = [
      {
        filename: 'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
        sizeBytes: 100,
        createdAt: '2026-08-26T00:00:00.000Z',
      },
    ];
    mockListAutoBackupFiles.mockReturnValue(files);
    const { req, res } = createMockReqRes();

    listAutoBackups(req, res);

    expect(res.json).toHaveBeenCalledWith(files);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 when listing fails', () => {
    mockListAutoBackupFiles.mockImplementation(() => {
      throw new Error('disk error');
    });
    const { req, res } = createMockReqRes();

    listAutoBackups(req, res);

    expectJsonStatus(res, 500, { error: 'Failed to list automatic backups' });
  });
});

describe('downloadAutoBackup', () => {
  const filename = 'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip';

  it('streams the file with the correct headers on success', () => {
    mockResolveAutoBackupPath.mockReturnValue(`/backups/${filename}`);
    mockReadFileSync.mockReturnValue(Buffer.from('zip-bytes'));
    const { req, res } = createMockReqRes({ params: { filename } });

    downloadAutoBackup(req, res);

    expect(mockResolveAutoBackupPath).toHaveBeenCalledWith(filename);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('zip-bytes'));
  });

  it('returns 404 when the filename is invalid or the file does not exist', () => {
    mockResolveAutoBackupPath.mockReturnValue(null);
    const { req, res } = createMockReqRes({
      params: { filename: '../../etc/passwd' },
    });

    downloadAutoBackup(req, res);

    expectJsonStatus(res, 404, { error: 'Backup file not found' });
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns 500 when reading the file fails unexpectedly', () => {
    mockResolveAutoBackupPath.mockReturnValue(`/backups/${filename}`);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('read error');
    });
    const { req, res } = createMockReqRes({ params: { filename } });

    downloadAutoBackup(req, res);

    expectJsonStatus(res, 500, {
      error: 'Failed to download automatic backup',
    });
  });
});
