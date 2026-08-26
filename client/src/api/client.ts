const _apiDomain = import.meta.env.VITE_API_DOMAIN;
/* v8 ignore next 3 -- domain truthy branch depends on VITE_API_DOMAIN env var, not set in test env */
const API_BASE = _apiDomain
  ? `${_apiDomain}:${import.meta.env.VITE_API_PORT}`
  : '';

/**
 * Builds a full request URL for `path`, for callers that need the URL
 * itself rather than a fetch response (e.g. an `<a href>` download link).
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function json(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * Thrown by {@link apiJson} so callers can surface structured validation
 * failures (e.g. which backup trips are missing which image files) rather
 * than just a message.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Reads an error response's `{ error, details }` JSON body, falling back to
 * a generic message when the body isn't JSON or has no `error` field.
 */
async function readErrorBody(
  res: Response,
  url: string,
): Promise<{ message: string; details?: unknown }> {
  try {
    const body = (await res.json()) as { error?: string; details?: unknown };
    return {
      message: body.error ?? `API error ${res.status}: ${url}`,
      details: body.details,
    };
  } catch {
    return { message: `API error ${res.status}: ${url}` };
  }
}

/**
 * Like {@link api}, but for endpoints that respond with a binary payload
 * (e.g. a zip download) rather than JSON. On failure, prefers the server's
 * `{ error }` JSON body for the thrown message, falling back to a generic
 * one when the response isn't JSON.
 */
export async function apiBlob(url: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const { message } = await readErrorBody(res, url);
    throw new Error(message);
  }
  return res.blob();
}

/**
 * Like {@link api}, but throws an {@link ApiError} carrying the server's
 * `details` field (if any) on failure, for endpoints whose error responses
 * need to convey more than a single message (e.g. backup import validation).
 */
export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const { message, details } = await readErrorBody(res, url);
    throw new ApiError(message, details);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
