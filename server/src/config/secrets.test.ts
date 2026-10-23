import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { readSecret } from './secrets';

const KEY = 'TEST_SECRET';
const FILE_KEY = `${KEY}_FILE`;

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tripdeck-secrets-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
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
      const filePath = path.join(tmpDir, 'secret');
      fs.writeFileSync(filePath, fileContents);
      process.env[FILE_KEY] = filePath;
    }

    expect(readSecret(KEY, defaultValue)).toBe(expected);
  });

  it('throws when the secret file cannot be read', () => {
    process.env[FILE_KEY] = path.join(tmpDir, 'missing');

    expect(() => readSecret(KEY)).toThrow(`Failed to read ${FILE_KEY}`);
  });
});
