import { type Mock, vi } from 'vitest';

/** Mocked `Logger` whose methods are all `vi.fn()`s. */
export interface LoggerMock {
  debug: Mock;
  info: Mock;
  warn: Mock;
  error: Mock;
}

/** Creates a logger whose methods are independent `vi.fn()`s. */
export function createLoggerMock(): LoggerMock {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Shared logger mock (a per-file singleton, since each test file has its own
 * module registry). Source modules call `createLogger()` at import time, so
 * the factory must resolve this instance before returning:
 *
 * ```ts
 * vi.mock('../logger', async () => {
 *   const { mockLogger } = await import('../test-utils/loggerMock');
 *   return { createLogger: () => mockLogger };
 * });
 * import { mockLogger } from '../test-utils/loggerMock';
 * ```
 */
export const mockLogger = createLoggerMock();
