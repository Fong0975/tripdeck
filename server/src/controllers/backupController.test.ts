import { describe, expect, it, vi } from 'vitest';

const mockListAutoBackupFiles = vi.fn();
const mockResolveAutoBackupPath = vi.fn();

vi.mock('../repositories/backup', () => ({
  listAutoBackupFiles: (...args: unknown[]) => mockListAutoBackupFiles(...args),
  resolveAutoBackupPath: (...args: unknown[]) =>
    mockResolveAutoBackupPath(...args),
}));

vi.mock('fs', async () => {
  const { fsMock } = await import('../test-utils/fsMock');
  return fsMock.module;
});

import { fsMock } from '../test-utils/fsMock';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';

import { downloadAutoBackup, listAutoBackups } from './backupController';

const mockReadFileSync = fsMock.fns.readFileSync;

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

  it('throws the underlying error for the error handler when listing fails', () => {
    const error = new Error('disk error');
    mockListAutoBackupFiles.mockImplementation(() => {
      throw error;
    });
    const { req, res } = createMockReqRes();

    expect(() => listAutoBackups(req, res)).toThrow(error);
    expect(res.status).not.toHaveBeenCalled();
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

  it('throws the underlying error for the error handler when reading fails', () => {
    const error = new Error('read error');
    mockResolveAutoBackupPath.mockReturnValue(`/backups/${filename}`);
    mockReadFileSync.mockImplementation(() => {
      throw error;
    });
    const { req, res } = createMockReqRes({ params: { filename } });

    expect(() => downloadAutoBackup(req, res)).toThrow(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
