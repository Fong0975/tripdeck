import { api } from './client';

/**
 * Asks the backend to look up the `<title>` of an external web page, used to
 * suggest a display name for a reference link.
 *
 * @param url - The external page's URL.
 * @param signal - Aborts the lookup (e.g. on timeout).
 * @returns The raw (possibly HTML-entity-encoded) page title, or `null` when
 *   the page has none.
 * @throws {ApiError} when the backend rejects the URL (e.g. 400) or the lookup fails.
 */
export async function fetchPageTitle(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const data = await api<{ title: string | null }>(
    `/api/fetch-title?url=${encodeURIComponent(url)}`,
    { signal },
  );
  return data.title;
}
