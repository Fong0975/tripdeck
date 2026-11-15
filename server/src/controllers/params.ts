import type { Request } from 'express';

/**
 * Reads a numeric id route parameter.
 *
 * Route files register `validateIdParams` for every id param, so by the time a
 * handler runs the value is guaranteed to be a positive integer string; this
 * helper only performs the conversion.
 *
 * @param req - Incoming request whose route declares the param.
 * @param name - Route parameter name (e.g. `'tripId'`).
 * @returns The parameter value as a number.
 */
export function idParam(req: Request, name: string): number {
  return Number(req.params[name]);
}
