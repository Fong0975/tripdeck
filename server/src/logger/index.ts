import { readLoggerConfig } from './config';
import { writeLogLine } from './fileTransport';
import { safeStringify, serializeError } from './serialize';
import type { LogLevel, LogMeta } from './types';

export type { LogMeta } from './types';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  /**
   * `err` is normally the value caught from a `catch` block; it is
   * serialized into `meta.error` via `serializeError` so callers don't each
   * need their own `err instanceof Error` handling.
   */
  error(message: string, meta?: LogMeta, err?: unknown): void;
}

function write(
  tag: string,
  level: LogLevel,
  message: string,
  meta?: LogMeta,
): void {
  const config = readLoggerConfig();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[config.level]) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };

  writeLogLine(config, safeStringify(entry));
}

/**
 * Creates a tagged logger that writes JSON-lines entries to the file
 * configured by `LOG_DIR`/`LOG_FILENAME` (see `logger/config.ts`).
 *
 * Call sites should invoke the returned methods as properties (e.g.
 * `logger.info(...)`), not destructure them (`const { info } = ...`) —
 * tests intercept logging via `vi.spyOn(logger, 'info')`, which replaces the
 * property in place and would not affect an already-destructured reference.
 */
export function createLogger(tag: string): Logger {
  return {
    debug(message, meta) {
      write(tag, 'debug', message, meta);
    },
    info(message, meta) {
      write(tag, 'info', message, meta);
    },
    warn(message, meta) {
      write(tag, 'warn', message, meta);
    },
    error(message, meta, err) {
      const fullMeta =
        err !== undefined ? { ...meta, error: serializeError(err) } : meta;
      write(tag, 'error', message, fullMeta);
    },
  };
}
