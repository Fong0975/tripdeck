import { expandShortUrl, isShortLink } from './shortUrlExpander';
import { TtlCache } from './ttlCache';
import { type Coordinates, parseCoordinatesFromUrl } from './urlParser';

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

// Successful lookups end up in the database; this cache mainly stops failed
// or repeated short-link expansions from hitting Google again and again.
const expansionCache = new TtlCache<Coordinates | null>(
  CACHE_TTL_MS,
  CACHE_MAX_ENTRIES,
);
const inFlight = new Map<string, Promise<Coordinates | null>>();

async function expandAndParse(
  link: string,
  expand: typeof expandShortUrl,
): Promise<Coordinates | null> {
  const expanded = await expand(link);
  return expanded ? parseCoordinatesFromUrl(expanded) : null;
}

/**
 * Derives coordinates from an attraction's Google Maps link without using any
 * Google API quota: first by parsing the link itself, then, for short links
 * such as maps.app.goo.gl, by following its redirects and parsing the result.
 *
 * @param link - Free-text link; may be empty.
 * @param expand - Injectable short-link expander, for tests.
 * @returns The coordinates, or null when the link is empty or yields none.
 */
export async function resolveCoordinatesFromLink(
  link: string | null | undefined,
  expand: typeof expandShortUrl = expandShortUrl,
): Promise<Coordinates | null> {
  const trimmed = link?.trim();
  if (!trimmed) {
    return null;
  }

  const direct = parseCoordinatesFromUrl(trimmed);
  if (direct || !isShortLink(trimmed)) {
    return direct;
  }

  const cached = expansionCache.get(trimmed);
  if (cached !== undefined) {
    return cached;
  }
  const pending = inFlight.get(trimmed);
  if (pending) {
    return pending;
  }

  const lookup = expandAndParse(trimmed, expand)
    .then(coordinates => {
      expansionCache.set(trimmed, coordinates);
      return coordinates;
    })
    .finally(() => inFlight.delete(trimmed));
  inFlight.set(trimmed, lookup);
  return lookup;
}

/** Test-only: forgets cached and in-flight short-link lookups. */
export function __resetLinkResolverForTests(): void {
  expansionCache.clear();
  inFlight.clear();
}
