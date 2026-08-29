import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadLoggerConfig = vi.fn();
const mockWriteLogLine = vi.fn();

vi.mock('./config', () => ({
  readLoggerConfig: (...args: unknown[]) => mockReadLoggerConfig(...args),
}));
vi.mock('./fileTransport', () => ({
  writeLogLine: (...args: unknown[]) => mockWriteLogLine(...args),
}));

import { createLogger } from './index';

function configWithLevel(level: 'debug' | 'info' | 'warn' | 'error') {
  return {
    level,
    dir: '/logs',
    filename: 'app.log',
    maxSizeBytes: 10 * 1024 * 1024,
    maxFiles: 5,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReadLoggerConfig.mockReturnValue(configWithLevel('debug'));
});

describe('createLogger', () => {
  it('writes a JSON-lines entry with the tag, level, and message', () => {
    const logger = createLogger('db');

    logger.info('Tables verified', { tableCount: 5 });

    expect(mockWriteLogLine).toHaveBeenCalledTimes(1);
    const [, line] = mockWriteLogLine.mock.calls[0];
    const entry = JSON.parse(line);

    expect(entry).toMatchObject({
      level: 'info',
      tag: 'db',
      message: 'Tables verified',
      meta: { tableCount: 5 },
    });
    expect(typeof entry.timestamp).toBe('string');
  });

  it('omits the meta field entirely when none is passed', () => {
    createLogger('db').info('no meta here');

    const [, line] = mockWriteLogLine.mock.calls[0];
    expect(JSON.parse(line)).not.toHaveProperty('meta');
  });

  it('serializes the third argument of error() into meta.error', () => {
    createLogger('backup').error(
      'Failed to restore checklist template',
      { tripId: 1 },
      new Error('boom'),
    );

    const [, line] = mockWriteLogLine.mock.calls[0];
    const entry = JSON.parse(line);

    expect(entry.meta).toMatchObject({
      tripId: 1,
      error: { name: 'Error', message: 'boom' },
    });
  });

  it('skips writing when the level is below the configured threshold', () => {
    mockReadLoggerConfig.mockReturnValue(configWithLevel('warn'));
    const logger = createLogger('db');

    logger.debug('too quiet to matter');
    logger.info('still below threshold');
    expect(mockWriteLogLine).not.toHaveBeenCalled();

    logger.warn('this clears the bar');
    expect(mockWriteLogLine).toHaveBeenCalledTimes(1);
  });

  it('re-reads the config on every call rather than caching it', () => {
    const logger = createLogger('db');

    mockReadLoggerConfig.mockReturnValue(configWithLevel('error'));
    logger.info('suppressed after level tightens');
    expect(mockWriteLogLine).not.toHaveBeenCalled();

    mockReadLoggerConfig.mockReturnValue(configWithLevel('debug'));
    logger.info('allowed after level loosens');
    expect(mockWriteLogLine).toHaveBeenCalledTimes(1);
  });

  it('exposes methods as spy-able properties rather than bound closures', () => {
    const logger = createLogger('db');
    const spy = vi.spyOn(logger, 'warn');

    logger.warn('hello');

    expect(spy).toHaveBeenCalledWith('hello');
  });
});
