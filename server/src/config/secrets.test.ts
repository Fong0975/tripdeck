import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../logger';

const readFileSync = vi.hoisted(() => vi.fn());
vi.mock('fs', () => ({ default: { readFileSync } }));

import { readSecret, readSecretOrEmpty } from './secrets';

const KEY = 'TEST_SECRET';
const FILE_KEY = `${KEY}_FILE`;
const SECRET_PATH = '/run/secrets/test_secret';
const MISSING_PATH = '/run/secrets/missing';

beforeEach(() => {
  readFileSync.mockReset();
  readFileSync.mockImplementation((filePath: string) => {
    if (filePath === MISSING_PATH) {
      throw new Error('ENOENT');
    }
    return '';
  });
});

afterEach(() => {
  delete process.env[KEY];
  delete process.env[FILE_KEY];
});

describe('readSecret', () => {
  it.each([
    {
      description: 'falls back to the default when nothing is set',
      env: undefined,
      fileContents: undefined,
      defaultValue: 'fallback',
      expected: 'fallback',
    },
    {
      description: 'reads the plain env var when no _FILE is set',
      env: 'from-env',
      fileContents: undefined,
      defaultValue: '',
      expected: 'from-env',
    },
    {
      description: 'prefers the secret file over the plain env var',
      env: 'from-env',
      fileContents: 'from-file',
      defaultValue: '',
      expected: 'from-file',
    },
    {
      description: 'trims a trailing LF from the secret file',
      env: undefined,
      fileContents: 'p@ss\n',
      defaultValue: '',
      expected: 'p@ss',
    },
    {
      description: 'trims a trailing CRLF from the secret file',
      env: undefined,
      fileContents: 'p@ss\r\n',
      defaultValue: '',
      expected: 'p@ss',
    },
    {
      description: 'keeps surrounding spaces in the secret file',
      env: undefined,
      fileContents: ' p@ss \n',
      defaultValue: '',
      expected: ' p@ss ',
    },
    {
      description: 'falls back to the default when the secret file is empty',
      env: 'from-env',
      fileContents: '\n',
      defaultValue: 'fallback',
      expected: 'fallback',
    },
  ])('$description', ({ env, fileContents, defaultValue, expected }) => {
    if (env !== undefined) {
      process.env[KEY] = env;
    }
    if (fileContents !== undefined) {
      readFileSync.mockReturnValue(fileContents);
      process.env[FILE_KEY] = SECRET_PATH;
    }

    expect(readSecret(KEY, defaultValue)).toBe(expected);
    if (fileContents !== undefined) {
      expect(readFileSync).toHaveBeenCalledWith(SECRET_PATH, 'utf-8');
    } else {
      expect(readFileSync).not.toHaveBeenCalled();
    }
  });

  it('throws when the secret file cannot be read', () => {
    process.env[FILE_KEY] = MISSING_PATH;

    expect(() => readSecret(KEY)).toThrow(`Failed to read ${FILE_KEY}`);
  });
});

describe('readSecretOrEmpty', () => {
  function makeLogger(): Logger {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  }

  it.each([
    {
      description: 'returns the resolved secret without logging',
      env: 'from-env',
      missingFile: false,
      expected: 'from-env',
      logsError: false,
    },
    {
      description:
        'returns an empty string and logs when the file is unreadable',
      env: 'from-env',
      missingFile: true,
      expected: '',
      logsError: true,
    },
  ])('$description', ({ env, missingFile, expected, logsError }) => {
    const logger = makeLogger();
    process.env[KEY] = env;
    if (missingFile) {
      process.env[FILE_KEY] = MISSING_PATH;
    }

    expect(readSecretOrEmpty(KEY, logger)).toBe(expected);
    if (logsError) {
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to load ${KEY} secret`,
        undefined,
        expect.any(Error),
      );
    } else {
      expect(logger.error).not.toHaveBeenCalled();
    }
  });
});
