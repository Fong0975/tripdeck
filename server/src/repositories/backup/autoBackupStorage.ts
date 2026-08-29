import fs from 'fs';
import path from 'path';

import { createLogger } from '../../logger';
import type { AutoBackupFileInfo } from '../../types/backup';

const logger = createLogger('auto-backup');

/**
 * Directory automatic backups are written to. Resolved relative to this
 * module's own location (same pattern as `UPLOADS_DIR`) so it points at
 * `server/backups` in both dev (`src/`) and the compiled build (`dist/`).
 */
export const BACKUPS_DIR = path.join(__dirname, '../../../backups');

const AUTO_BACKUP_PREFIX = 'tripdeck-auto-backup-';

/**
 * Matches exactly the filenames `buildAutoBackupFilename` produces, e.g.
 * `tripdeck-auto-backup-2026-08-26T12-00-00-000Z.zip`. Used both to filter
 * `listAutoBackupFiles` and, critically, as a path-traversal guard: a
 * filename is only ever joined into a filesystem path once it has matched
 * this fixed pattern.
 */
const AUTO_BACKUP_FILENAME_RE =
  /^tripdeck-auto-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.zip$/;

/**
 * Builds a filesystem-safe, chronologically-sortable filename, e.g.
 * `tripdeck-auto-backup-2026-08-26T12-00-00-000Z.zip`. The ISO timestamp
 * (colons/dots replaced with dashes) sorts lexically the same as
 * chronologically, so filenames alone are enough to order or prune backups.
 */
export function buildAutoBackupFilename(now: Date): string {
  return `${AUTO_BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.zip`;
}

/** True when `name` matches the exact automatic-backup filename pattern. */
export function isAutoBackupFilename(name: string): boolean {
  return AUTO_BACKUP_FILENAME_RE.test(name);
}

function toFileInfo(filename: string): AutoBackupFileInfo {
  const stats = fs.statSync(path.join(BACKUPS_DIR, filename));
  return {
    filename,
    sizeBytes: stats.size,
    createdAt: stats.mtime.toISOString(),
  };
}

/**
 * Writes `buffer` to disk as a new automatic backup file, creating
 * `BACKUPS_DIR` first if it doesn't exist yet.
 */
export function writeAutoBackupFile(buffer: Buffer): AutoBackupFileInfo {
  const filename = buildAutoBackupFilename(new Date());
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUPS_DIR, filename), buffer);
  } catch (err) {
    logger.error(
      'Failed to write automatic backup file',
      { dir: BACKUPS_DIR, filename, sizeBytes: buffer.length },
      err,
    );
    throw err;
  }
  const info = toFileInfo(filename);
  logger.info('Automatic backup file written', info);
  return info;
}

/**
 * Lists every automatic backup file on disk, newest first. Returns an empty
 * array (rather than throwing) when `BACKUPS_DIR` doesn't exist yet, since
 * that just means no backup has ever been written.
 */
export function listAutoBackupFiles(): AutoBackupFileInfo[] {
  if (!fs.existsSync(BACKUPS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter(isAutoBackupFilename)
    .map(toFileInfo);

  return files.sort((a, b) => (a.filename > b.filename ? -1 : 1));
}

/**
 * Deletes every automatic backup file beyond the `retain` most recent
 * (ordered the same way as `listAutoBackupFiles`). A `retain` of 0 or less
 * disables pruning entirely rather than deleting everything.
 */
export function pruneOldAutoBackups(retain: number): void {
  if (retain <= 0) {
    return;
  }

  const files = listAutoBackupFiles();
  const toDelete = files.slice(retain);
  let deleted = 0;
  for (const file of toDelete) {
    try {
      fs.unlinkSync(path.join(BACKUPS_DIR, file.filename));
      deleted++;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        continue; // Already removed — safe to ignore.
      }
      logger.error(
        'Failed to delete old automatic backup file',
        { filename: file.filename },
        err,
      );
    }
  }

  if (toDelete.length > 0) {
    logger.info('Pruned old automatic backups', {
      retain,
      deleted,
      candidateCount: toDelete.length,
    });
  }
}

/**
 * Resolves `filename` to a full path under `BACKUPS_DIR`, or null when it
 * isn't a valid automatic-backup filename or the file doesn't exist.
 * Rejects path traversal by construction: a filename is only ever joined
 * into a path after matching the fixed automatic-backup naming pattern, so
 * arbitrary input (e.g. containing `..` or path separators) never reaches
 * `path.join`.
 */
export function resolveAutoBackupPath(filename: string): string | null {
  if (!isAutoBackupFilename(filename)) {
    logger.warn('Rejected filename not matching the backup naming pattern', {
      filename,
    });
    return null;
  }

  const filePath = path.join(BACKUPS_DIR, filename);
  return fs.existsSync(filePath) ? filePath : null;
}
