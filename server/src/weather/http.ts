/** Upper bound for every weather provider request. */
export const WEATHER_FETCH_TIMEOUT_MS = 8000;

/** Outcome of {@link fetchJson}: the parsed body, or the failing HTTP status. */
export type FetchJsonResult<T> =
  { ok: true; data: T } | { ok: false; status: number };

/** Options for {@link fetchJson}. */
export interface FetchJsonOptions {
  /** Aborts the request once this many milliseconds have elapsed. */
  timeoutMs: number;
}

/**
 * GETs a URL with a timeout and parses a successful response as JSON.
 *
 * Network errors, timeouts and malformed JSON reject; non-2xx responses
 * resolve with their status so each provider can map them to its own result.
 * Callers should not log `url`, since weather provider URLs carry API keys.
 *
 * @param url - Absolute request URL.
 * @param options - Request options.
 * @returns The parsed body (cast to `T`, not validated) or the error status.
 */
export async function fetchJson<T>(
  url: string,
  { timeoutMs }: FetchJsonOptions,
): Promise<FetchJsonResult<T>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  return { ok: true, data: (await res.json()) as T };
}
