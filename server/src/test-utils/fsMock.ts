import { type Mock, vi } from 'vitest';

export interface FsMock<K extends string> {
  fns: Record<K, Mock>;
  /** Module shape to return from a `vi.mock('fs')` factory. */
  module: { default: Record<K, Mock> } & Record<K, Mock>;
}

/**
 * Creates `vi.fn()`s for the given `fs` functions, exposed both as the
 * default export (`import fs from 'fs'`) and as named exports.
 *
 * @param keys - Names of the `fs` functions to mock.
 */
export function createFsMock<K extends string>(keys: K[]): FsMock<K> {
  const fns = Object.fromEntries(keys.map(key => [key, vi.fn()])) as Record<
    K,
    Mock
  >;
  return { fns, module: { default: fns, ...fns } };
}

/**
 * Shared `fs` mock covering the sync functions used by the server (a
 * per-file singleton, since each test file has its own module registry):
 *
 * ```ts
 * vi.mock('fs', async () => (await import('../test-utils/fsMock')).fsMock.module);
 * import { fsMock } from '../test-utils/fsMock';
 * ```
 */
export const fsMock = createFsMock([
  'appendFileSync',
  'copyFileSync',
  'existsSync',
  'mkdirSync',
  'readFileSync',
  'readdirSync',
  'renameSync',
  'statSync',
  'unlinkSync',
  'writeFileSync',
]);
