import type { NextFunction, Request, Response } from 'express';
import { expect, it, type Mock, vi } from 'vitest';

interface MockReqOverrides {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  body?: unknown;
  file?: Express.Multer.File;
  method?: string;
  originalUrl?: string;
}

/**
 * Creates a minimal mock Express req/res pair (plus a `next` spy) for
 * controller and middleware unit tests.
 * `res.status`/`res.json`/`res.send` are `vi.fn()`s that return `res` (chainable),
 * matching how the real Express Response behaves.
 */
export function createMockReqRes(overrides: MockReqOverrides = {}): {
  req: Request;
  res: Response;
  next: NextFunction & Mock;
} {
  const req = {
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: overrides.body ?? {},
    file: overrides.file,
    method: overrides.method,
    originalUrl: overrides.originalUrl,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction & Mock;

  return { req, res, next };
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

/** One handler whose dependency failure must propagate to the error handler. */
export interface RejectCase {
  /** Handler name, used in the test title. */
  name: string;
  // Method syntax keeps the parameter check bivariant, so handlers typed
  // with a narrower `Request` still fit.
  handler(req: Request, res: Response): Promise<void>;
  req?: MockReqOverrides;
  /** Makes the dependency the handler reaches for first reject with `error`. */
  arrange: (error: Error) => void;
}

/**
 * Registers one table-driven test asserting that each handler rejects with
 * the dependency's error, untouched, and sends no response of its own, so
 * the central error handler is the one that answers. Call it inside a
 * `describe` block.
 *
 * @param cases - Handlers with their request and failure setup.
 */
export function itRejects(cases: RejectCase[]): void {
  it.each(cases)(
    '$name rejects with the underlying error for the error handler',
    async ({ handler, req, arrange }) => {
      const error = new Error('unexpected failure');
      arrange(error);
      const { req: mockReq, res } = createMockReqRes(req);

      await expect(handler(mockReq, res)).rejects.toBe(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    },
  );
}
