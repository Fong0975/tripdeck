import { createLogger } from '../logger';
import * as backupRepo from '../repositories/backup';

const logger = createLogger('auto-backup');

const DEFAULT_INTERVAL_DAYS = 15;
const DEFAULT_CHECK_INTERVAL_HOURS = 24;
const DEFAULT_RETENTION_COUNT = 6;

/**
 * The floor `startAutoBackupScheduler` clamps its check interval to, so a
 * misconfigured 0/negative value can never spin the timer.
 */
const MIN_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Reads a non-negative integer env var, falling back to `defaultValue` when
 * unset or not a valid non-negative number.
 */
function readIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

/**
 * Reads a boolean env var: unset falls back to `defaultValue`; any set
 * value other than "false" (case-insensitive) is treated as true.
 */
function readBoolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  return raw === undefined ? defaultValue : raw.toLowerCase() !== 'false';
}

export interface AutoBackupSchedulerConfig {
  enabled: boolean;
  intervalDays: number;
  checkIntervalHours: number;
  retentionCount: number;
}

/**
 * Reads the automatic-backup scheduler's configuration from environment
 * variables, applying the documented defaults for anything unset.
 */
export function readAutoBackupConfig(): AutoBackupSchedulerConfig {
  return {
    enabled: readBoolEnv('AUTO_BACKUP_ENABLED', true),
    intervalDays: readIntEnv(
      'AUTO_BACKUP_INTERVAL_DAYS',
      DEFAULT_INTERVAL_DAYS,
    ),
    checkIntervalHours: readIntEnv(
      'AUTO_BACKUP_CHECK_INTERVAL_HOURS',
      DEFAULT_CHECK_INTERVAL_HOURS,
    ),
    retentionCount: readIntEnv(
      'AUTO_BACKUP_RETENTION_COUNT',
      DEFAULT_RETENTION_COUNT,
    ),
  };
}

/**
 * True when no automatic backup exists yet, or the newest one is at least
 * `intervalDays` old.
 */
export function isAutoBackupDue(intervalDays: number): boolean {
  const files = backupRepo.listAutoBackupFiles();
  if (files.length === 0) {
    return true;
  }

  // listAutoBackupFiles() is already sorted newest-first.
  const newestAgeMs = Date.now() - new Date(files[0].createdAt).getTime();
  return newestAgeMs >= intervalDays * 24 * 60 * 60 * 1000;
}

/**
 * Builds and writes a new automatic backup, then prunes old ones, but only
 * when one is actually due. Any failure is logged rather than thrown, so a
 * single bad run never stops the periodic timer that calls this.
 */
export async function runAutoBackupIfDue(
  config: AutoBackupSchedulerConfig,
): Promise<void> {
  try {
    if (!isAutoBackupDue(config.intervalDays)) {
      logger.debug('No backup due yet', {
        intervalDays: config.intervalDays,
      });
      return;
    }

    logger.info('Automatic backup due, starting', {
      intervalDays: config.intervalDays,
    });

    const buffer = await backupRepo.buildSystemBackupZip();
    const info = backupRepo.writeAutoBackupFile(buffer);
    backupRepo.pruneOldAutoBackups(config.retentionCount);

    logger.info('Automatic backup completed', {
      filename: info.filename,
      sizeBytes: info.sizeBytes,
      retentionCount: config.retentionCount,
    });
  } catch (err) {
    logger.error(
      'Failed to create automatic backup',
      {
        intervalDays: config.intervalDays,
        retentionCount: config.retentionCount,
      },
      err,
    );
  }
}

/**
 * Starts the periodic automatic-backup checker and returns its timer (or
 * null when `AUTO_BACKUP_ENABLED=false`). Deliberately does *not* run a
 * check immediately: `setInterval` only fires after the first full
 * `AUTO_BACKUP_CHECK_INTERVAL_HOURS` has elapsed, so starting the server
 * never itself triggers a backup. The timer is `unref`'d so it never keeps
 * the process alive on its own.
 */
export function startAutoBackupScheduler(): NodeJS.Timeout | null {
  const config = readAutoBackupConfig();
  if (!config.enabled) {
    logger.info('Disabled via AUTO_BACKUP_ENABLED=false');
    return null;
  }

  const checkIntervalMs = Math.max(
    config.checkIntervalHours * 60 * 60 * 1000,
    MIN_CHECK_INTERVAL_MS,
  );

  logger.info('Scheduler started', {
    intervalDays: config.intervalDays,
    checkIntervalHours: config.checkIntervalHours,
    retentionCount: config.retentionCount,
  });

  const timer = setInterval(() => {
    void runAutoBackupIfDue(config);
  }, checkIntervalMs);
  timer.unref();

  return timer;
}
