import type { RequestParamHandler, Router } from 'express';

import { createLogger } from '../logger';
import { parseId } from '../utils/parseId';

const logger = createLogger('http');

/**
 * `router.param` handler that rejects a request with 400 `Invalid <name>`
 * when the route parameter is not a positive integer id, so controllers can
 * rely on every id param being valid.
 */
export const rejectInvalidIdParam: RequestParamHandler = (
  req,
  res,
  next,
  value: unknown,
  name: string | number,
) => {
  if (parseId(value) === null) {
    logger.warn('Rejected request with an invalid id param', {
      method: req.method,
      path: req.originalUrl,
      param: name,
      value,
    });
    res.status(400).json({ error: `Invalid ${String(name)}` });
    return;
  }
  next();
};

/**
 * Registers {@link rejectInvalidIdParam} for each of the given route
 * parameter names on `router`.
 *
 * @param router - Router whose route paths declare the params.
 * @param names - Param names to validate (e.g. `['tripId', 'dayId']`).
 */
export function validateIdParams(router: Router, names: string[]): void {
  for (const name of names) {
    router.param(name, rejectInvalidIdParam);
  }
}
