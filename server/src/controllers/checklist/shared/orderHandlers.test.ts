import { describe, expect, it, vi } from 'vitest';

import {
  createMockReqRes,
  expectJsonStatus,
} from '../../../test-utils/httpMocks';
import { mockLogger } from '../../../test-utils/loggerMock';

import { handleReorder, parseMoveTarget } from './orderHandlers';
import {
  ORDERED_IDS_MISMATCH_ERROR,
  ORDERED_IDS_REQUIRED_ERROR,
  TARGET_CATEGORY_REQUIRED_ERROR,
} from './validation';

const logger = mockLogger as never;

describe('handleReorder', () => {
  it.each([
    {
      name: 'a malformed body',
      body: { orderedIds: 'x' },
      repoResult: 'reordered' as const,
      status: 400,
      json: { error: ORDERED_IDS_REQUIRED_ERROR },
      reorderCalled: false,
    },
    {
      name: 'a list that does not match the siblings',
      body: { orderedIds: [1, 2] },
      repoResult: 'invalid_order' as const,
      status: 400,
      json: { error: ORDERED_IDS_MISMATCH_ERROR },
      reorderCalled: true,
    },
    {
      name: 'a matching list',
      body: { orderedIds: [2, 1] },
      repoResult: 'reordered' as const,
      status: 204,
      json: undefined,
      reorderCalled: true,
    },
  ])(
    'responds for $name',
    async ({ body, repoResult, status, json, reorderCalled }) => {
      const reorder = vi.fn().mockResolvedValue(repoResult);
      const { res } = createMockReqRes();

      await handleReorder(
        { logger, label: 'Things', body, meta: { tripId: 1 }, reorder },
        res,
      );

      expectJsonStatus(res, status, json);
      expect(reorder).toHaveBeenCalledTimes(reorderCalled ? 1 : 0);
      if (status === 204) {
        expect(res.send).toHaveBeenCalled();
        expect(reorder).toHaveBeenCalledWith([2, 1]);
      }
    },
  );
});

describe('parseMoveTarget', () => {
  it.each([
    {
      name: 'a valid body',
      body: { targetCategoryId: 3 },
      expected: 3,
      status: null,
    },
    { name: 'an invalid body', body: {}, expected: null, status: 400 },
  ])('returns the target for $name', ({ body, expected, status }) => {
    const { res } = createMockReqRes();

    const result = parseMoveTarget({ logger, body, meta: {} }, res);

    expect(result).toBe(expected);
    if (status === null) {
      expect(res.status).not.toHaveBeenCalled();
    } else {
      expectJsonStatus(res, status, { error: TARGET_CATEGORY_REQUIRED_ERROR });
    }
  });
});
