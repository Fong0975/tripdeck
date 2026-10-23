import type { NextFunction, Request, Response } from 'express';
import { expect, it, type Mock, vi } from 'vitest';

export interface MockReqOverrides {
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

/** One handler whose unexpected failure must surface as a 500 response. */
export interface Returns500Case {
  /** Handler name, used in the test title. */
  name: string;
  // Method syntax keeps the parameter check bivariant, so handlers typed
  // with a narrower `Request` still fit.
  handler(req: Request, res: Response): Promise<void>;
  req?: MockReqOverrides;
  /** Makes the dependency the handler reaches for first reject with `error`. */
  arrange: (error: Error) => void;
  expectedError: string;
}

/**
 * Registers one table-driven test asserting that each handler responds with
 * `500 { error: expectedError }` when a dependency rejects unexpectedly.
 * Call it inside a `describe` block.
 *
 * @param cases - Handlers with their request and failure setup.
 */
export function itReturns500(cases: Returns500Case[]): void {
  it.each(cases)(
    '$name returns 500 with its error message on an unexpected error',
    async ({ handler, req, arrange, expectedError }) => {
      arrange(new Error('unexpected failure'));
      const { req: mockReq, res } = createMockReqRes(req);

      await handler(mockReq, res);

      expectJsonStatus(res, 500, { error: expectedError });
    },
  );
}
