import path from 'path';

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockMkdirSync = vi.fn();
const mockStatSync = vi.fn();
const mockAppendFileSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockRenameSync = vi.fn();
const mockUnlinkSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    statSync: (...args: unknown[]) => mockStatSync(...args),
    appendFileSync: (...args: unknown[]) => mockAppendFileSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    renameSync: (...args: unknown[]) => mockRenameSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  },
}));

import { writeLogLine } from './fileTransport';
import type { LoggerConfig } from './types';

const config: LoggerConfig = {
  level: 'info',
  dir: '/logs',
  filename: 'app.log',
  maxSizeBytes: 100,
  maxFiles: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReaddirSync.mockReturnValue([]);
  // writeLogLine no-ops under Vitest unless explicitly forced — see the
  // comment on isDisabledForTests() in fileTransport.ts.
  process.env.LOG_FORCE_WRITE = 'true';
});

afterAll(() => {
  delete process.env.LOG_FORCE_WRITE;
});

describe('writeLogLine', () => {
  it('ensures the log directory exists before writing', () => {
    mockStatSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    writeLogLine(config, 'hello');

    expect(mockMkdirSync).toHaveBeenCalledWith('/logs', { recursive: true });
  });

  it('appends without rotating when the file does not exist yet', () => {
    mockStatSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    writeLogLine(config, 'hello');

    expect(mockRenameSync).not.toHaveBeenCalled();
    expect(mockAppendFileSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.log'),
      'hello\n',
    );
  });

  it('appends without rotating when under the size limit', () => {
    mockStatSync.mockReturnValue({ size: 10 });

    writeLogLine(config, 'hello');

    expect(mockRenameSync).not.toHaveBeenCalled();
    expect(mockAppendFileSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.log'),
      'hello\n',
    );
  });

  it('rotates before appending when the write would exceed the size limit', () => {
    mockStatSync.mockReturnValue({ size: 99 });
    mockReaddirSync.mockReturnValue(['app.log', 'app.1.log']);

    writeLogLine(config, 'hello');

    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.1.log'),
      path.join('/logs', 'app.2.log'),
    );
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.log'),
      path.join('/logs', 'app.1.log'),
    );
    expect(mockAppendFileSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.log'),
      'hello\n',
    );
  });

  it('deletes rotated files beyond maxFiles during rotation', () => {
    mockStatSync.mockReturnValue({ size: 99 });
    mockReaddirSync.mockReturnValue(['app.log', 'app.1.log', 'app.2.log']);

    writeLogLine({ ...config, maxFiles: 2 }, 'hello');

    expect(mockUnlinkSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.2.log'),
    );
  });

  it('treats a missing log directory as empty when scanning for rotation', () => {
    mockStatSync.mockReturnValue({ size: 99 });
    mockReaddirSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    expect(() => writeLogLine(config, 'hello')).not.toThrow();
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/logs', 'app.log'),
      path.join('/logs', 'app.1.log'),
    );
  });

  it('no-ops without touching the filesystem unless LOG_FORCE_WRITE=true', () => {
    delete process.env.LOG_FORCE_WRITE;

    writeLogLine(config, 'hello');

    expect(mockMkdirSync).not.toHaveBeenCalled();
    expect(mockAppendFileSync).not.toHaveBeenCalled();
  });
});
