import type { Router } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';

import { rejectInvalidIdParam, validateIdParams } from './validateIdParam';

describe('rejectInvalidIdParam', () => {
  const tests = [
    { name: 'a positive integer', value: '12', valid: true },
    { name: 'zero', value: '0', valid: false },
    { name: 'a negative number', value: '-1', valid: false },
    { name: 'a decimal', value: '1.5', valid: false },
    { name: 'a non-numeric string', value: 'abc', valid: false },
  ];

  it.each(tests)('handles $name', ({ value, valid }) => {
    const { req, res, next } = createMockReqRes();

    rejectInvalidIdParam(req, res, next, value, 'tripId');

    if (valid) {
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    } else {
      expect(next).not.toHaveBeenCalled();
      expectJsonStatus(res, 400, { error: 'Invalid tripId' });
    }
  });
});

describe('validateIdParams', () => {
  it('registers the handler for every given param name', () => {
    const param = vi.fn();
    const router = { param } as unknown as Router;

    validateIdParams(router, ['tripId', 'dayId']);

    expect(param.mock.calls).toEqual([
      ['tripId', rejectInvalidIdParam],
      ['dayId', rejectInvalidIdParam],
    ]);
  });
});
