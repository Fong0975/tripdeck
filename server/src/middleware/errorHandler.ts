import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { createLogger } from '../logger';

const logger = createLogger('http');

/**
 * Global Express error handler. Must be registered last, after every route
 * (Express recognizes it as an error handler purely by its 4-argument
 * signature). Anything that reaches here — a synchronous throw a
 * controller didn't catch, a rejected promise passed to `next(err)`, or a
 * Multer error from `upload`/`backupUpload` (e.g. a file exceeding the size
 * limit) — is logged and turned into a consistent JSON error response
 * instead of falling through to Express's default HTML error page.
 */
export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  // Express only recognizes an error handler by its 4-argument arity; this
  // parameter must stay declared even though the handler always terminates
  // the response itself.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
) => {
  if (err instanceof multer.MulterError) {
    logger.warn('Upload rejected by multer', {
      method: req.method,
      path: req.originalUrl,
      code: err.code,
      field: err.field,
    });
    res.status(400).json({ error: `Upload rejected: ${err.code}` });
    return;
  }

  logger.error(
    'Unhandled error reached the global error handler',
    { method: req.method, path: req.originalUrl, params: req.params },
    err,
  );
  res.status(500).json({ error: 'Internal server error' });
};
