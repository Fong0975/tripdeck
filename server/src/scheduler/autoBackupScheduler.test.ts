import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockListAutoBackupFiles = vi.fn();
const mockBuildSystemBackupZip = vi.fn();
const mockWriteAutoBackupFile = vi.fn();
const mockPruneOldAutoBackups = vi.fn();

vi.mock('../repositories/backup', () => ({
  listAutoBackupFiles: (...args: unknown[]) => mockListAutoBackupFiles(...args),
  buildSystemBackupZip: (...args: unknown[]) =>
    mockBuildSystemBackupZip(...args),
  writeAutoBackupFile: (...args: unknown[]) => mockWriteAutoBackupFile(...args),
  pruneOldAutoBackups: (...args: unknown[]) => mockPruneOldAutoBackups(...args),
}));

import {
  type AutoBackupSchedulerConfig,
  isAutoBackupDue,
  readAutoBackupConfig,
  runAutoBackupIfDue,
  startAutoBackupScheduler,
} from './autoBackupScheduler';

const ENV_KEYS = [
  'AUTO_BACKUP_ENABLED',
  'AUTO_BACKUP_INTERVAL_DAYS',
  'AUTO_BACKUP_CHECK_INTERVAL_HOURS',
  'AUTO_BACKUP_RETENTION_COUNT',
] as const;

let originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>>;

beforeEach(() => {
  vi.clearAllMocks();
  originalEnv = {};
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('readAutoBackupConfig', () => {
  it('returns the documented defaults when nothing is set', () => {
    expect(readAutoBackupConfig()).toEqual({
      enabled: true,
      intervalDays: 15,
      checkIntervalHours: 24,
      retentionCount: 6,
    });
  });

  it('reads overrides from environment variables', () => {
    process.env.AUTO_BACKUP_ENABLED = 'false';
    process.env.AUTO_BACKUP_INTERVAL_DAYS = '7';
    process.env.AUTO_BACKUP_CHECK_INTERVAL_HOURS = '12';
    process.env.AUTO_BACKUP_RETENTION_COUNT = '3';

    expect(readAutoBackupConfig()).toEqual({
      enabled: false,
      intervalDays: 7,
      checkIntervalHours: 12,
      retentionCount: 3,
    });
  });

  it('falls back to the default for an invalid numeric value', () => {
    process.env.AUTO_BACKUP_INTERVAL_DAYS = 'not-a-number';

    expect(readAutoBackupConfig().intervalDays).toBe(15);
  });

  it.each([
    { value: 'false', expected: false },
    { value: 'FALSE', expected: false },
    { value: 'true', expected: true },
    { value: '1', expected: true },
  ])(
    'treats AUTO_BACKUP_ENABLED="$value" as enabled: $expected',
    ({ value, expected }) => {
      process.env.AUTO_BACKUP_ENABLED = value;

      expect(readAutoBackupConfig().enabled).toBe(expected);
    },
  );
});

describe('isAutoBackupDue', () => {
  it('is due when there are no existing backups', () => {
    mockListAutoBackupFiles.mockReturnValue([]);

    expect(isAutoBackupDue(15)).toBe(true);
  });

  it('is not due when the newest backup is within the interval', () => {
    mockListAutoBackupFiles.mockReturnValue([
      { filename: 'a.zip', sizeBytes: 1, createdAt: daysAgoIso(5) },
    ]);

    expect(isAutoBackupDue(15)).toBe(false);
  });

  it('is due when the newest backup is older than the interval', () => {
    mockListAutoBackupFiles.mockReturnValue([
      { filename: 'a.zip', sizeBytes: 1, createdAt: daysAgoIso(20) },
    ]);

    expect(isAutoBackupDue(15)).toBe(true);
  });
});

describe('runAutoBackupIfDue', () => {
  const baseConfig: AutoBackupSchedulerConfig = {
    enabled: true,
    intervalDays: 15,
    checkIntervalHours: 24,
    retentionCount: 6,
  };

  it('does nothing when a backup is not due', async () => {
    mockListAutoBackupFiles.mockReturnValue([
      { filename: 'a.zip', sizeBytes: 1, createdAt: daysAgoIso(1) },
    ]);

    await runAutoBackupIfDue(baseConfig);

    expect(mockBuildSystemBackupZip).not.toHaveBeenCalled();
    expect(mockWriteAutoBackupFile).not.toHaveBeenCalled();
    expect(mockPruneOldAutoBackups).not.toHaveBeenCalled();
  });

  it('builds, writes, and prunes when a backup is due', async () => {
    mockListAutoBackupFiles.mockReturnValue([]);
    const buffer = Buffer.from('zip-bytes');
    mockBuildSystemBackupZip.mockResolvedValue(buffer);

    await runAutoBackupIfDue(baseConfig);

    expect(mockWriteAutoBackupFile).toHaveBeenCalledWith(buffer);
    expect(mockPruneOldAutoBackups).toHaveBeenCalledWith(6);
  });

  it('logs and does not throw when building the backup fails', async () => {
    mockListAutoBackupFiles.mockReturnValue([]);
    mockBuildSystemBackupZip.mockRejectedValue(new Error('disk full'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runAutoBackupIfDue(baseConfig)).resolves.toBeUndefined();

    expect(mockWriteAutoBackupFile).not.toHaveBeenCalled();
    expect(mockPruneOldAutoBackups).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe('startAutoBackupScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockListAutoBackupFiles.mockReturnValue([]);
    mockBuildSystemBackupZip.mockResolvedValue(Buffer.from('zip'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null and starts no timer when disabled', () => {
    process.env.AUTO_BACKUP_ENABLED = 'false';

    const timer = startAutoBackupScheduler();

    expect(timer).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not run a check immediately on start', async () => {
    startAutoBackupScheduler();
    await Promise.resolve();

    expect(mockListAutoBackupFiles).not.toHaveBeenCalled();
  });

  it('runs a check after the configured interval elapses', async () => {
    process.env.AUTO_BACKUP_CHECK_INTERVAL_HOURS = '1';

    startAutoBackupScheduler();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(mockListAutoBackupFiles).toHaveBeenCalledTimes(1);
    expect(mockBuildSystemBackupZip).toHaveBeenCalledTimes(1);
  });

  it('clamps a too-small check interval to the one-minute minimum', async () => {
    process.env.AUTO_BACKUP_CHECK_INTERVAL_HOURS = '0';

    startAutoBackupScheduler();
    await vi.advanceTimersByTimeAsync(59 * 1000);
    expect(mockListAutoBackupFiles).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockListAutoBackupFiles).toHaveBeenCalledTimes(1);
  });
});
