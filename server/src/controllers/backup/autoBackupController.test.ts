import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

const mockListAutoBackupFiles = vi.fn();
const mockResolveAutoBackupPath = vi.fn();

vi.mock('../../repositories/backup', () => ({
  listAutoBackupFiles: (...args: unknown[]) => mockListAutoBackupFiles(...args),
  resolveAutoBackupPath: (...args: unknown[]) =>
    mockResolveAutoBackupPath(...args),
}));

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';
import { mockLogger } from '../../test-utils/loggerMock';

import { downloadAutoBackup, listAutoBackups } from './autoBackupController';

type DownloadCallback = (err?: Error) => void;

/** Adds the `res.download`/`res.headersSent` members the shared mock lacks. */
function withDownload(res: Response, headersSent = false) {
  const download = vi.fn();
  Object.assign(res, { download, headersSent });
  return download;
}

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
  const filePath = `/backups/${filename}`;

  it('streams the file from disk as a zip attachment', () => {
    mockResolveAutoBackupPath.mockReturnValue(filePath);
    const { req, res, next } = createMockReqRes({ params: { filename } });
    const download = withDownload(res);

    downloadAutoBackup(req, res, next);

    expect(mockResolveAutoBackupPath).toHaveBeenCalledWith(filename);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(download).toHaveBeenCalledWith(
      filePath,
      filename,
      expect.any(Function),
    );
    expect(res.send).not.toHaveBeenCalled();
  });

  it('returns 404 when the filename is invalid or the file does not exist', () => {
    mockResolveAutoBackupPath.mockReturnValue(null);
    const { req, res, next } = createMockReqRes({
      params: { filename: '../../../etc/passwd' },
    });
    const download = withDownload(res);

    downloadAutoBackup(req, res, next);

    expectJsonStatus(res, 404, { error: 'Backup file not found' });
    expect(download).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'does nothing more when the transfer succeeds',
      error: undefined,
      headersSent: false,
      expectNext: false,
      expectWarn: false,
    },
    {
      name: 'forwards a read error to the error handler before headers are sent',
      error: new Error('read error'),
      headersSent: false,
      expectNext: true,
      expectWarn: false,
    },
    {
      name: 'only logs an error that happens after headers were sent',
      error: new Error('client aborted'),
      headersSent: true,
      expectNext: false,
      expectWarn: true,
    },
  ])('$name', ({ error, headersSent, expectNext, expectWarn }) => {
    mockResolveAutoBackupPath.mockReturnValue(filePath);
    const { req, res, next } = createMockReqRes({ params: { filename } });
    const download = withDownload(res, headersSent);

    downloadAutoBackup(req, res, next);
    const callback = download.mock.calls[0][2] as DownloadCallback;
    callback(error);

    if (expectNext) {
      expect(next).toHaveBeenCalledWith(error);
    } else {
      expect(next).not.toHaveBeenCalled();
    }
    if (expectWarn) {
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Automatic backup download aborted mid-stream',
        { filename, reason: 'client aborted' },
      );
    } else {
      expect(mockLogger.warn).not.toHaveBeenCalled();
    }
    expect(res.status).not.toHaveBeenCalled();
  });
});
