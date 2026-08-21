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
