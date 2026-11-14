import { describe, expect, it } from 'vitest';

import {
  createMockReqRes,
  expectJsonStatus,
} from '../../../test-utils/httpMocks';
import { createLoggerMock } from '../../../test-utils/loggerMock';

import {
  type ChecklistEntity,
  rejectInvalidBody,
  rejectNotFound,
} from './responses';

describe('rejectInvalidBody', () => {
  const tests = [
    {
      label: 'with ids',
      action: 'add-item',
      error: 'name is required',
      meta: { catId: 1 },
      expectedMessage: 'Rejected add-item request: name is required',
    },
    {
      label: 'without ids',
      action: 'add-category',
      error: 'name must be at most 255 characters',
      meta: undefined,
      expectedMessage:
        'Rejected add-category request: name must be at most 255 characters',
    },
  ];

  it.each(tests)(
    'logs and responds 400 $label',
    ({ action, error, meta, expectedMessage }) => {
      const logger = createLoggerMock();
      const { res } = createMockReqRes();

      rejectInvalidBody(res, logger, action, error, meta);

      expect(logger.warn).toHaveBeenCalledWith(expectedMessage, meta);
      expectJsonStatus(res, 400, { error });
    },
  );
});

describe('rejectNotFound', () => {
  const tests: Array<{ entity: ChecklistEntity; expectedError: string }> = [
    { entity: 'Trip', expectedError: 'Trip not found' },
    { entity: 'Category', expectedError: 'Category not found' },
    { entity: 'Item', expectedError: 'Item not found' },
    { entity: 'Spec', expectedError: 'Spec not found' },
    { entity: 'Occasion', expectedError: 'Occasion not found' },
  ];

  it.each(tests)(
    'logs and responds 404 for a missing $entity',
    ({ entity, expectedError }) => {
      const logger = createLoggerMock();
      const { res } = createMockReqRes();
      const meta = { tripId: 1 };

      rejectNotFound(res, logger, entity, 'Lookup rejected', meta);

      expect(logger.warn).toHaveBeenCalledWith('Lookup rejected', meta);
      expectJsonStatus(res, 404, { error: expectedError });
    },
  );
});
