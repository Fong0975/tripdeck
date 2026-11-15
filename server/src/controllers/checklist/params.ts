import type { Request } from 'express';

/**
 * Reads a route id param that the router has already validated as a positive
 * integer (see `validateIdParams`), so no further checks are needed here.
 *
 * @param req - Incoming request.
 * @param name - Route param name (e.g. `'catId'`).
 * @returns The param value as a number.
 */
export function idParam(req: Request, name: string): number {
  return Number(req.params[name]);
}

/**
 * Reads several validated route id params at once.
 *
 * @param req - Incoming request.
 * @param names - Route param names to read; duplicates collapse into one key.
 * @returns A map of param name to numeric id.
 */
export function idParams<K extends string>(
  req: Request,
  ...names: K[]
): Record<K, number> {
  const ids = {} as Record<K, number>;
  for (const name of names) {
    ids[name] = idParam(req, name);
  }
  return ids;
}
