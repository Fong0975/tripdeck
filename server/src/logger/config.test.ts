import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readLoggerConfig } from './config';

const ENV_KEYS = [
  'LOG_LEVEL',
  'LOG_DIR',
  'LOG_FILENAME',
  'LOG_MAX_SIZE_MB',
  'LOG_MAX_FILES',
] as const;

let originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>>;

beforeEach(() => {
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

describe('readLoggerConfig', () => {
  it('returns the documented defaults when nothing is set', () => {
    const config = readLoggerConfig();

    expect(config.level).toBe('info');
    expect(config.dir).toBe(path.join(__dirname, '../../logs'));
    expect(config.filename).toBe('app.log');
    expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
    expect(config.maxFiles).toBe(5);
  });

  it('reads overrides from environment variables', () => {
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.LOG_DIR = '/var/log/tripdeck';
    process.env.LOG_FILENAME = 'server.log';
    process.env.LOG_MAX_SIZE_MB = '25';
    process.env.LOG_MAX_FILES = '10';

    expect(readLoggerConfig()).toEqual({
      level: 'debug',
      dir: '/var/log/tripdeck',
      filename: 'server.log',
      maxSizeBytes: 25 * 1024 * 1024,
      maxFiles: 10,
    });
  });

  it('falls back to the default level for an invalid value', () => {
    process.env.LOG_LEVEL = 'verbose';

    expect(readLoggerConfig().level).toBe('info');
  });

  it('falls back to the default size for a zero or invalid LOG_MAX_SIZE_MB', () => {
    process.env.LOG_MAX_SIZE_MB = '0';
    expect(readLoggerConfig().maxSizeBytes).toBe(10 * 1024 * 1024);

    process.env.LOG_MAX_SIZE_MB = 'not-a-number';
    expect(readLoggerConfig().maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('treats LOG_MAX_FILES=0 as unlimited retention rather than falling back', () => {
    process.env.LOG_MAX_FILES = '0';

    expect(readLoggerConfig().maxFiles).toBe(0);
  });
});
