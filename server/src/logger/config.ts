import path from 'path';

import type { LoggerConfig, LogLevel } from './types';

const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

const DEFAULT_LEVEL: LogLevel = 'info';
/**
 * Resolved relative to this module's own location (same pattern as
 * `UPLOADS_DIR`/`BACKUPS_DIR`) so it points at `server/logs` in both dev
 * (`src/`) and the compiled build (`dist/`), unless overridden by `LOG_DIR`.
 */
const DEFAULT_DIR = path.join(__dirname, '../../logs');
const DEFAULT_FILENAME = 'app.log';
const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 5;

/**
 * Reads an enum-constrained env var (case-insensitive), falling back to
 * `defaultValue` when unset or not one of `allowed`.
 */
function readEnumEnv<T extends string>(
  name: string,
  allowed: readonly T[],
  defaultValue: T,
): T {
  const raw = process.env[name]?.toLowerCase();
  return (allowed as readonly string[]).includes(raw ?? '')
    ? (raw as T)
    : defaultValue;
}

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
 * Reads a positive integer env var (0 is treated as invalid, unlike
 * `readIntEnv`), falling back to `defaultValue` otherwise. Used for
 * `LOG_MAX_SIZE_MB`, where 0 has no meaningful rotation semantics.
 */
function readPositiveIntEnv(name: string, defaultValue: number): number {
  const value = readIntEnv(name, defaultValue);
  return value > 0 ? value : defaultValue;
}

/**
 * Reads the logger's configuration from environment variables, applying the
 * documented defaults for anything unset or invalid. Called fresh on every
 * log write rather than cached, since reading a handful of env vars is
 * cheap and this keeps the logger free of hidden module-level state.
 */
export function readLoggerConfig(): LoggerConfig {
  const maxSizeMb = readPositiveIntEnv('LOG_MAX_SIZE_MB', DEFAULT_MAX_SIZE_MB);

  return {
    level: readEnumEnv('LOG_LEVEL', LOG_LEVELS, DEFAULT_LEVEL),
    dir: process.env.LOG_DIR?.trim() || DEFAULT_DIR,
    filename: process.env.LOG_FILENAME?.trim() || DEFAULT_FILENAME,
    maxSizeBytes: maxSizeMb * 1024 * 1024,
    maxFiles: readIntEnv('LOG_MAX_FILES', DEFAULT_MAX_FILES),
  };
}
