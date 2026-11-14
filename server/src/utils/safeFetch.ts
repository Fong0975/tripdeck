import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { isPublicAddress } from './publicAddress';

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 8_000;
const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml'];

/** Raised when a URL (or a redirect hop) points somewhere the server must not contact. */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

/** Resolves a hostname to every address it maps to. */
export type LookupFn = (hostname: string) => Promise<string[]>;

/**
 * Default {@link LookupFn} backed by the system resolver.
 *
 * @param hostname - A DNS hostname (not an IP literal).
 * @returns Every IPv4/IPv6 address the hostname resolves to.
 */
export const systemLookup: LookupFn = async hostname => {
  const entries = await lookup(hostname, { all: true, verbatim: true });
  return entries.map(entry => entry.address);
};

export interface FetchHtmlOptions {
  /** Injectable fetch, for tests. */
  fetchFn?: typeof fetch;
  /** Injectable DNS resolver, for tests. */
  lookupFn?: LookupFn;
  /** Request headers sent on every hop. */
  headers?: HeadersInit;
  /** Maximum number of redirects to follow. */
  maxRedirects?: number;
  /** Maximum number of body bytes to read; the rest is discarded. */
  maxBytes?: number;
  /** Overall deadline for the whole redirect chain and body read. */
  timeoutMs?: number;
}

/**
 * Ensures `url` is an http(s) URL without credentials whose host resolves
 * exclusively to public addresses.
 *
 * @param url - The URL about to be requested.
 * @param lookupFn - Resolver used for non-literal hostnames.
 * @throws UnsafeUrlError when the URL must not be contacted.
 */
export async function assertPublicUrl(
  url: URL,
  lookupFn: LookupFn,
): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(`Disallowed protocol ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('Credentials in URL are not allowed');
  }

  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  const addresses = isIP(host) ? [host] : await lookupFn(host);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    throw new UnsafeUrlError(`Host ${url.hostname} is not publicly routable`);
  }
}

function isHtmlContentType(contentType: string | null): boolean {
  const normalized = (contentType ?? '').toLowerCase();
  return HTML_CONTENT_TYPES.some(type => normalized.includes(type));
}

function discardBody(response: Response): void {
  void response.body?.cancel().catch(() => undefined);
}

/**
 * Reads at most `maxBytes` of a response body as UTF-8 text, cancelling the
 * stream as soon as the cap is reached so oversized pages are never fully
 * downloaded.
 *
 * @param response - The response whose body to read.
 * @param maxBytes - Byte cap for the returned text.
 * @returns The (possibly truncated) body text.
 */
export async function readCappedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    return '';
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = value.subarray(0, maxBytes - total);
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Fetches an HTML page on behalf of a client while guarding against SSRF.
 *
 * Every hop of the redirect chain (followed manually, at most
 * `maxRedirects`) is re-validated with {@link assertPublicUrl}, only HTML
 * responses are accepted and the body is read up to `maxBytes`.
 *
 * Note: the address is checked before the request, and fetch resolves the
 * hostname again itself, so a DNS record that changes between the two
 * lookups (DNS rebinding) is not covered by this check.
 *
 * @param rawUrl - Absolute URL supplied by the client.
 * @param options - Limits, headers and injectable dependencies.
 * @returns The (possibly truncated) HTML text of the final response.
 * @throws UnsafeUrlError when the URL or any redirect target is disallowed.
 * @throws Error on network failure, timeout, too many redirects or a
 *   non-HTML response.
 */
export async function fetchHtml(
  rawUrl: string,
  options: FetchHtmlOptions = {},
): Promise<string> {
  const {
    fetchFn = fetch,
    lookupFn = systemLookup,
    headers,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const signal = AbortSignal.timeout(timeoutMs);
  let current = new URL(rawUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current, lookupFn);
    const response = await fetchFn(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers,
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      discardBody(response);
      current = new URL(location, current);
      continue;
    }

    const contentType = response.headers.get('content-type');
    if (!isHtmlContentType(contentType)) {
      discardBody(response);
      throw new Error(`Unsupported content type: ${contentType ?? 'none'}`);
    }
    return readCappedText(response, maxBytes);
  }

  throw new Error(`Exceeded the limit of ${maxRedirects} redirects`);
}
