export interface Coordinates {
  lat: number;
  lng: number;
}

const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
const PLACE_PIN = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`);
const VIEWPORT_CENTER = new RegExp(`@(${NUMBER}),(${NUMBER})`);
const LAT_LNG_PAIR = new RegExp(`^\\s*(${NUMBER})\\s*,\\s*(${NUMBER})\\s*$`);
const COORDINATE_QUERY_PARAMS = ['q', 'query', 'll', 'center', 'destination'];

function toCoordinates(latRaw: string, lngRaw: string): Coordinates | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Extracts coordinates from a Google Maps link without any network call.
 * Checked in order of precision: the place pin (`!3d<lat>!4d<lng>`), the
 * viewport center (`@<lat>,<lng>`), then a `q`/`query`/`ll`/`center`/
 * `destination` query parameter holding a `lat,lng` pair.
 *
 * @param rawUrl - Link as pasted by the user.
 * @returns The coordinates, or null when the link carries none.
 */
export function parseCoordinatesFromUrl(rawUrl: string): Coordinates | null {
  const decoded = safeDecode(rawUrl);

  for (const pattern of [PLACE_PIN, VIEWPORT_CENTER]) {
    const match = pattern.exec(decoded);
    const coordinates = match && toCoordinates(match[1], match[2]);
    if (coordinates) {
      return coordinates;
    }
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  for (const param of COORDINATE_QUERY_PARAMS) {
    const match = LAT_LNG_PAIR.exec(url.searchParams.get(param) ?? '');
    const coordinates = match && toCoordinates(match[1], match[2]);
    if (coordinates) {
      return coordinates;
    }
  }
  return null;
}
