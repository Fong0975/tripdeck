import fs from 'fs';

import type { Logger } from '../logger';

/**
 * Reads a secret value, preferring the file named by the `<key>_FILE`
 * environment variable (the Docker secrets convention, e.g.
 * `/run/secrets/db_password`) over the plain `<key>` environment variable, so
 * a secret mounted into the container never has to appear in its environment.
 *
 * Trailing CR/LF is trimmed from the file contents because secret files are
 * commonly written with a terminating newline; other whitespace is kept since
 * it may be part of the secret itself. An empty file yields `defaultValue`.
 *
 * @param key - Name of the secret's environment variable, e.g. `DB_PASSWORD`.
 * @param defaultValue - Returned when neither source provides a value.
 * @returns The resolved secret value.
 * @throws Error when `<key>_FILE` is set but the file cannot be read.
 */
export function readSecret(key: string, defaultValue = ''): string {
  const fileKey = `${key}_FILE`;
  const filePath = process.env[fileKey];
  if (!filePath) {
    return process.env[key] ?? defaultValue;
  }

  let contents: string;
  try {
    contents = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read ${fileKey}`, { cause: err });
  }

  return contents.replace(/[\r\n]+$/, '') || defaultValue;
}

/**
 * Like {@link readSecret}, but an unreadable secret file is logged and
 * treated as an empty value instead of throwing, so the server still starts
 * and the missing credential surfaces through the feature that needs it.
 *
 * @param key - Name of the secret's environment variable, e.g. `DB_PASSWORD`.
 * @param logger - Logger the read failure is reported to.
 * @returns The resolved secret value, or `''` when it can't be read.
 */
export function readSecretOrEmpty(key: string, logger: Logger): string {
  try {
    return readSecret(key);
  } catch (err) {
    logger.error(`Failed to load ${key} secret`, undefined, err);
    return '';
  }
}
