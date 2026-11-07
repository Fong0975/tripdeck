import type { RequestHandler } from 'express';

/**
 * Restores Express 4 semantics where `req.body` is always an object.
 * Express 5 leaves `req.body` undefined when a request carries no body (or
 * no parseable Content-Type), which makes controllers that destructure it
 * throw a TypeError instead of reaching their 400 validation branch.
 * Register right after `express.json()`.
 */
export const defaultJsonBody: RequestHandler = (req, _res, next) => {
  req.body ??= {};
  next();
};
