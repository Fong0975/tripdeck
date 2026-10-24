import { createLogger } from '../logger';

const logger = createLogger('maps');

const MAX_REDIRECTS = 5;
const EXPAND_TIMEOUT_MS = 5_000;
const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);
// google.com, www./maps.google.com and country variants such as google.com.tw
// or google.co.jp; deliberately excludes subdomains like consent.google.com.
const GOOGLE_MAPS_HOST =
  /^(?:www\.|maps\.)?google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/i;

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Whether `raw` is a Google short link (e.g. https://maps.app.goo.gl/abc). */
export function isShortLink(raw: string): boolean {
  const url = parseUrl(raw);
  return url !== null && SHORT_LINK_HOSTS.has(url.hostname.toLowerCase());
}

/**
 * Hosts the expander may contact. Everything else is refused so a crafted
 * link can't make the server request arbitrary (e.g. internal) addresses.
 */
function isAllowedHop(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (SHORT_LINK_HOSTS.has(host)) {
    return true;
  }
  return GOOGLE_MAPS_HOST.test(host) && url.pathname.startsWith('/maps');
}

/**
 * Follows a Google short link's redirects (at most 5, 5 s per request) and
 * returns the URL it leads to. Only short-link hosts are ever fetched: the
 * walk stops at the first redirect target that is not a short link, and that
 * target is returned unfetched. A target outside the allow-listed Google
 * hosts is likewise returned unfetched (only so its text can still be searched
 * for coordinates). This makes no Google API call and uses no quota.
 *
 * @param startUrl - A short link.
 * @param fetchFn - Injectable fetch, for tests.
 * @returns The final URL, or null when the link is not allowed, a request
 *   fails, or the redirect chain is too long.
 */
export async function expandShortUrl(
  startUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  let current = parseUrl(startUrl);
  if (!current || !isAllowedHop(current)) {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetchFn(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS),
      });
    } catch (err) {
      logger.warn('Short link expansion request failed', {
        host: current.hostname,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
    void res.body?.cancel().catch(() => undefined);

    const location = res.headers.get('location');
    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect || !location) {
      return current.toString();
    }

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return null;
    }
    if (!isAllowedHop(next)) {
      logger.warn('Stopped short link expansion at a disallowed host', {
        host: next.hostname,
      });
      return next.toString();
    }
    if (!SHORT_LINK_HOSTS.has(next.hostname.toLowerCase())) {
      return next.toString();
    }
    current = next;
  }

  logger.warn('Short link expansion exceeded the redirect limit', {
    host: current.hostname,
  });
  return null;
}
