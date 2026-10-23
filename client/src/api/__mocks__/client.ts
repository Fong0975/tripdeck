import { vi } from 'vitest';

/**
 * Manual mock for `@/api/client`, activated with `vi.mock('./client')` (or
 * `vi.mock('@/api/client')`). The request functions become spies so tests can
 * assert on the URL/init each endpoint builds, while the pure helpers
 * (`json`, `apiUrl`, `ApiError`) stay real so expectations can be written
 * with them.
 */
const actual = await vi.importActual<typeof import('../client')>('../client');

export const { json, apiUrl, ApiError } = actual;

/** Resolves `undefined` by default; `clearMocks` keeps this implementation. */
export const api = vi.fn<typeof actual.api>().mockResolvedValue(undefined);

export const apiBlob = vi.fn<typeof actual.apiBlob>();

export const apiJson = vi.fn<typeof actual.apiJson>();
