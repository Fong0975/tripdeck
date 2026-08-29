import fs from 'fs';
import path from 'path';

import { findRotatedIndexes, planRotation } from './rotate';
import type { LoggerConfig } from './types';

/** Splits "app.log" into { baseName: "app", ext: ".log" }. */
function splitFilename(filename: string): { baseName: string; ext: string } {
  const ext = path.extname(filename);
  const baseName = ext ? filename.slice(0, -ext.length) : filename;
  return { baseName, ext };
}

/**
 * Renames the active log file to "<baseName>.1<ext>" and shifts every
 * existing rotated file up by one, deleting whichever falls outside
 * `config.maxFiles` retention. See `planRotation` for the ordering that
 * guarantees no file is ever overwritten.
 */
function rotate(config: LoggerConfig): void {
  const { baseName, ext } = splitFilename(config.filename);

  let existingNames: string[];
  try {
    existingNames = fs.readdirSync(config.dir);
  } catch {
    existingNames = [];
  }

  const indexes = findRotatedIndexes(existingNames, baseName, ext);
  const steps = planRotation(baseName, ext, indexes, config.maxFiles);

  for (const step of steps) {
    const fromPath = path.join(config.dir, step.from);
    if (step.operation === 'delete') {
      fs.unlinkSync(fromPath);
    } else {
      fs.renameSync(fromPath, path.join(config.dir, step.to as string));
    }
  }
}

/**
 * Under Vitest, every module that (transitively) creates a logger would
 * otherwise perform real filesystem writes on every test run — most test
 * files never mock `fs` at all, and many that do only stub the handful of
 * functions their own code under test needs. Skipping the actual write here
 * keeps logging side-effect-free for every test suite except the logger's
 * own (`fileTransport.test.ts`), which opts back in with
 * `LOG_FORCE_WRITE=true` to exercise this function's real logic against a
 * fully-mocked `fs`.
 */
function isDisabledForTests(): boolean {
  return (
    process.env.VITEST === 'true' && process.env.LOG_FORCE_WRITE !== 'true'
  );
}

/**
 * Appends `line` (a single log entry, without its trailing newline) to the
 * active log file, rotating first if writing it would push the file past
 * `config.maxSizeBytes`.
 *
 * Every filesystem call here is synchronous, so the "check size -> rotate
 * -> append" sequence can never be interleaved with another write on
 * Node's single-threaded event loop — no additional locking is needed for
 * a single process.
 */
export function writeLogLine(config: LoggerConfig, line: string): void {
  if (isDisabledForTests()) {
    return;
  }

  fs.mkdirSync(config.dir, { recursive: true });

  const filePath = path.join(config.dir, config.filename);
  const incomingBytes = Buffer.byteLength(line, 'utf-8') + 1; // +1 for '\n'

  let currentSize = 0;
  try {
    currentSize = fs.statSync(filePath).size;
  } catch {
    currentSize = 0;
  }

  if (currentSize > 0 && currentSize + incomingBytes > config.maxSizeBytes) {
    rotate(config);
  }

  fs.appendFileSync(filePath, `${line}\n`);
}
