import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockStatSync = vi.fn();
const mockExistsSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockUnlinkSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    statSync: (...args: unknown[]) => mockStatSync(...args),
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  },
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../logger', () => ({
  createLogger: () => mockLogger,
}));

import {
  buildAutoBackupFilename,
  isAutoBackupFilename,
  listAutoBackupFiles,
  pruneOldAutoBackups,
  resolveAutoBackupPath,
  writeAutoBackupFile,
} from './autoBackupStorage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildAutoBackupFilename', () => {
  it('builds a filename with the ISO timestamp, colons/dots as dashes', () => {
    const now = new Date('2026-08-26T12:00:00.000Z');

    expect(buildAutoBackupFilename(now)).toBe(
      'tripdeck-auto-backup-2026-08-26T12-00-00-000Z.zip',
    );
  });
});

describe('isAutoBackupFilename', () => {
  it.each([
    {
      name: 'tripdeck-auto-backup-2026-08-26T12-00-00-000Z.zip',
      expected: true,
    },
    {
      // Manual per-trip export filename, not an automatic backup.
      name: 'tripdeck-backup-2026-08-26T12-00-00-000Z.zip',
      expected: false,
    },
    {
      name: 'tripdeck-auto-backup-2026-08-26T12-00-00-000Z.json',
      expected: false,
    },
    { name: '../../etc/passwd', expected: false },
    { name: 'tripdeck-auto-backup-not-a-date.zip', expected: false },
  ])('returns $expected for "$name"', ({ name, expected }) => {
    expect(isAutoBackupFilename(name)).toBe(expected);
  });
});

describe('writeAutoBackupFile', () => {
  it('creates the backups directory, writes the buffer, and returns file info', () => {
    mockStatSync.mockReturnValue({
      size: 1234,
      mtime: new Date('2026-08-26T12:00:00.000Z'),
    });

    const result = writeAutoBackupFile(Buffer.from('zip-bytes'));

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('backups'),
      { recursive: true },
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining(result.filename),
      Buffer.from('zip-bytes'),
    );
    expect(result).toEqual({
      filename: expect.stringMatching(/^tripdeck-auto-backup-.*\.zip$/),
      sizeBytes: 1234,
      createdAt: '2026-08-26T12:00:00.000Z',
    });
  });

  it('logs and rethrows when the write fails (e.g. disk full)', () => {
    const writeError = Object.assign(new Error('ENOSPC'), {
      code: 'ENOSPC',
    });
    mockWriteFileSync.mockImplementation(() => {
      throw writeError;
    });

    expect(() => writeAutoBackupFile(Buffer.from('zip-bytes'))).toThrow(
      writeError,
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to write automatic backup file',
      expect.objectContaining({ sizeBytes: 9 }),
      writeError,
    );
  });
});

describe('listAutoBackupFiles', () => {
  it('returns an empty array when the backups directory does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(listAutoBackupFiles()).toEqual([]);
    expect(mockReaddirSync).not.toHaveBeenCalled();
  });

  it('returns an empty array when the backups directory exists but is empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);

    expect(listAutoBackupFiles()).toEqual([]);
  });

  it('filters out non-matching filenames and sorts newest first', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      'tripdeck-auto-backup-2026-08-01T00-00-00-000Z.zip',
      'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
      '.gitkeep',
      'some-other-file.txt',
    ]);
    mockStatSync.mockReturnValue({
      size: 100,
      mtime: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = listAutoBackupFiles();

    expect(result.map(f => f.filename)).toEqual([
      'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
      'tripdeck-auto-backup-2026-08-01T00-00-00-000Z.zip',
    ]);
  });
});

describe('pruneOldAutoBackups', () => {
  const filenames = [
    'tripdeck-auto-backup-2026-08-06T00-00-00-000Z.zip',
    'tripdeck-auto-backup-2026-08-05T00-00-00-000Z.zip',
    'tripdeck-auto-backup-2026-08-04T00-00-00-000Z.zip',
    'tripdeck-auto-backup-2026-08-03T00-00-00-000Z.zip',
    'tripdeck-auto-backup-2026-08-02T00-00-00-000Z.zip',
    'tripdeck-auto-backup-2026-08-01T00-00-00-000Z.zip',
  ];

  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(filenames);
    mockStatSync.mockReturnValue({
      size: 100,
      mtime: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('deletes files beyond the retained count, keeping the newest', () => {
    pruneOldAutoBackups(2);

    expect(mockUnlinkSync).toHaveBeenCalledTimes(4);
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining(
        'tripdeck-auto-backup-2026-08-04T00-00-00-000Z.zip',
      ),
    );
    expect(mockUnlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'tripdeck-auto-backup-2026-08-06T00-00-00-000Z.zip',
      ),
    );
    expect(mockUnlinkSync).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'tripdeck-auto-backup-2026-08-05T00-00-00-000Z.zip',
      ),
    );
  });

  it('does nothing when there are not more files than retain', () => {
    pruneOldAutoBackups(10);

    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it('does nothing when retain is 0 or less', () => {
    pruneOldAutoBackups(0);

    expect(mockReaddirSync).not.toHaveBeenCalled();
    expect(mockUnlinkSync).not.toHaveBeenCalled();
  });

  it('silently ignores a file that is already gone (ENOENT) when deleting', () => {
    mockUnlinkSync.mockImplementation((filePath: string) => {
      if (filePath.includes('2026-08-04')) {
        throw Object.assign(new Error('no such file'), { code: 'ENOENT' });
      }
    });

    expect(() => pruneOldAutoBackups(2)).not.toThrow();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs (but does not throw) any other deletion failure', () => {
    const permissionError = Object.assign(new Error('denied'), {
      code: 'EACCES',
    });
    mockUnlinkSync.mockImplementation((filePath: string) => {
      if (filePath.includes('2026-08-04')) {
        throw permissionError;
      }
    });

    expect(() => pruneOldAutoBackups(2)).not.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to delete old automatic backup file',
      expect.objectContaining({
        filename: 'tripdeck-auto-backup-2026-08-04T00-00-00-000Z.zip',
      }),
      permissionError,
    );
  });
});

describe('resolveAutoBackupPath', () => {
  it('returns the full path when the filename is valid and the file exists', () => {
    mockExistsSync.mockReturnValue(true);

    const result = resolveAutoBackupPath(
      'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
    );

    expect(result).toEqual(
      expect.stringContaining(
        'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
      ),
    );
  });

  it('returns null and logs a WARN when the filename does not match the naming pattern', () => {
    mockExistsSync.mockReturnValue(true);

    expect(resolveAutoBackupPath('../../etc/passwd')).toBeNull();
    expect(mockExistsSync).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rejected filename not matching the backup naming pattern',
      { filename: '../../etc/passwd' },
    );
  });

  it('returns null when the filename is valid but the file does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = resolveAutoBackupPath(
      'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
    );

    expect(result).toBeNull();
  });
});
