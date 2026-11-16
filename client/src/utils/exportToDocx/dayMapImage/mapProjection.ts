/** A geographic coordinate in degrees. */
export interface GeoCoordinate {
  lat: number;
  lng: number;
}

/** A position on the drawing surface, in logical pixels. */
export interface CanvasPoint {
  x: number;
  y: number;
}

/** Result of fitting coordinates onto a drawing surface. */
export interface MapProjection {
  /** Logical size of the drawing surface. */
  width: number;
  height: number;
  /** Where each input coordinate lands, in input order. */
  points: CanvasPoint[];
}

/** Logical width of the drawing surface (matches the document content width). */
export const MAP_WIDTH = 602;
/** Free space kept left and right of the markers, for labels. */
export const MAP_PADDING_X = 140;
/** Free space kept above and below the markers, for labels. */
export const MAP_PADDING_Y = 56;
/** Shortest and tallest the marker area may be. */
export const MIN_INNER_HEIGHT = 140;
export const MAX_INNER_HEIGHT = 320;

/** Spans smaller than this (in degrees) count as a single position. */
const EPSILON = 1e-9;
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Fits coordinates onto a drawing surface with a flat (equirectangular)
 * projection. Longitude is shrunk by cos(latitude) so distances keep their
 * proportions, which is accurate enough for a single day's trip. The marker
 * area keeps the real aspect ratio within height limits, and the content is
 * centered with padding reserved for labels.
 *
 * @param coordinates - The coordinates to place; may be empty.
 * @returns The surface size and each coordinate's position, in input order.
 */
export function projectCoordinates(
  coordinates: GeoCoordinate[],
): MapProjection {
  const innerWidth = MAP_WIDTH - MAP_PADDING_X * 2;
  if (coordinates.length === 0) {
    return {
      width: MAP_WIDTH,
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      points: [],
    };
  }

  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lngFactor = Math.cos(((minLat + maxLat) / 2) * DEGREES_TO_RADIANS);

  const spanX = (maxLng - minLng) * lngFactor;
  const spanY = maxLat - minLat;
  const hasX = spanX > EPSILON;
  const hasY = spanY > EPSILON;

  const aspect = hasX && hasY ? spanY / spanX : hasY ? Infinity : 0;
  const innerHeight = Math.min(
    MAX_INNER_HEIGHT,
    Math.max(MIN_INNER_HEIGHT, innerWidth * aspect),
  );

  const scaleX = hasX ? innerWidth / spanX : Infinity;
  const scaleY = hasY ? innerHeight / spanY : Infinity;
  const scale = Math.min(scaleX, scaleY);
  const usedWidth = hasX ? spanX * scale : 0;
  const usedHeight = hasY ? spanY * scale : 0;
  const offsetX = MAP_PADDING_X + (innerWidth - usedWidth) / 2;
  const offsetY = MAP_PADDING_Y + (innerHeight - usedHeight) / 2;

  return {
    width: MAP_WIDTH,
    height: innerHeight + MAP_PADDING_Y * 2,
    points: coordinates.map(({ lat, lng }) => ({
      x: hasX ? offsetX + (lng - minLng) * lngFactor * scale : offsetX,
      y: hasY ? offsetY + (maxLat - lat) * scale : offsetY,
    })),
  };
}
