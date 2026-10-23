import multer from 'multer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { createMockReqRes } from '../test-utils/httpMocks';
import { mockLogger } from '../test-utils/loggerMock';

import { errorHandler } from './errorHandler';

function createErrorReqRes() {
  return createMockReqRes({
    method: 'POST',
    originalUrl: '/api/trips/1/images',
    params: { tripId: '1' },
  });
}

describe('errorHandler', () => {
  it('logs a WARN and returns 400 for a MulterError', () => {
    const { req, res, next } = createErrorReqRes();
    const err = new multer.MulterError('LIMIT_FILE_SIZE', 'image');

    errorHandler(err, req, res, next);

    expect(mockLogger.warn).toHaveBeenCalledWith('Upload rejected by multer', {
      method: 'POST',
      path: '/api/trips/1/images',
      code: 'LIMIT_FILE_SIZE',
      field: 'image',
    });
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Upload rejected: LIMIT_FILE_SIZE',
    });
  });

  it('logs an ERROR and returns 500 for any other error', () => {
    const { req, res, next } = createErrorReqRes();
    const err = new Error('boom');

    errorHandler(err, req, res, next);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unhandled error reached the global error handler',
      {
        method: 'POST',
        path: '/api/trips/1/images',
        params: { tripId: '1' },
      },
      err,
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });

  it('never calls next(), since it always terminates the response itself', () => {
    const { req, res, next } = createErrorReqRes();

    errorHandler(new Error('boom'), req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
