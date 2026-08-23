import type { Request, Response } from 'express';
import { expect, vi } from 'vitest';

interface MockReqOverrides {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  file?: Express.Multer.File;
}

/**
 * Creates a minimal mock Express req/res pair for controller unit tests.
 * `res.status`/`res.json`/`res.send` are `vi.fn()`s that return `res` (chainable),
 * matching how the real Express Response behaves.
 */
export function createMockReqRes(overrides: MockReqOverrides = {}) {
  const req = {
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: overrides.body ?? {},
    file: overrides.file,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;

  return { req, res };
}

/** Asserts that `res.status(code)` was called followed by `res.json(body)`. */
export function expectJsonStatus(
  res: Response,
  status: number,
  body?: unknown,
): void {
  expect(res.status).toHaveBeenCalledWith(status);
  if (body !== undefined) {
    expect(res.json).toHaveBeenCalledWith(body);
  }
}
