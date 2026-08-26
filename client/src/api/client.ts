const _apiDomain = import.meta.env.VITE_API_DOMAIN;
/* v8 ignore next 3 -- domain truthy branch depends on VITE_API_DOMAIN env var, not set in test env */
const API_BASE = _apiDomain
  ? `${_apiDomain}:${import.meta.env.VITE_API_PORT}`
  : '';

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
 * Like {@link api}, but for endpoints that respond with a binary payload
 * (e.g. a zip download) rather than JSON. On failure, prefers the server's
 * `{ error }` JSON body for the thrown message, falling back to a generic
 * one when the response isn't JSON.
 */
export async function apiBlob(url: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    let message = `API error ${res.status}: ${url}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Response body wasn't JSON — keep the generic message.
    }
    throw new Error(message);
  }
  return res.blob();
}
