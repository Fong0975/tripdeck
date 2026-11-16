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

/**
 * Result of fitting coordinates onto a drawing surface with a Web Mercator
 * (slippy map) projection, so map tiles of the same zoom line up with it.
 */
export interface MapProjection {
  /** Logical size of the drawing surface. */
  width: number;
  height: number;
  /** Integer tile zoom level the surface is drawn at. */
  zoom: number;
  /** World pixel (at `zoom`) shown at the surface's top-left corner. */
  originX: number;
  originY: number;
  /** Where each input coordinate lands, in input order. */
  points: CanvasPoint[];
}

/** Edge length of one map tile in pixels. */
export const TILE_SIZE = 256;
/** Logical width of the drawing surface (matches the document content width). */
export const MAP_WIDTH = 602;
/** Free space kept left and right of the markers, for labels. */
export const MAP_PADDING_X = 140;
/** Free space kept above and below the markers, for labels. */
export const MAP_PADDING_Y = 56;
/** Shortest and tallest the marker area may be. */
export const MIN_INNER_HEIGHT = 140;
export const MAX_INNER_HEIGHT = 320;
/** Zoom range the surface may use. */
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 17;
/** Zoom used when every marker sits on one spot (street level). */
export const SINGLE_POINT_ZOOM = 15;

/** Spans smaller than this (zoom-0 pixels, well under a metre) count as one position. */
const EPSILON = 1e-7;
/** Latitude limit of the Web Mercator projection. */
const MAX_LATITUDE = 85.0511287798;

/**
 * Converts a longitude to a world pixel x at a zoom level.
 *
 * @param lng - Longitude in degrees.
 * @param zoom - Zoom level; the world is `TILE_SIZE * 2^zoom` pixels wide.
 */
export function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

/**
 * Converts a latitude to a world pixel y at a zoom level (north is smaller).
 *
 * @param lat - Latitude in degrees; clamped to the projection's limits.
 * @param zoom - Zoom level; the world is `TILE_SIZE * 2^zoom` pixels tall.
 */
export function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const unit = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return unit * TILE_SIZE * 2 ** zoom;
}

/**
 * Fits coordinates onto a drawing surface at the highest integer zoom where
 * they all stay inside the padded marker area (padding is reserved for
 * labels), centered. An integer zoom keeps map tiles unscaled and sharp. The
 * marker area keeps the real aspect ratio within height limits.
 *
 * @param coordinates - The coordinates to place; may be empty.
 * @returns The surface size, zoom, view origin and each coordinate's position,
 *   in input order.
 */
export function projectCoordinates(
  coordinates: GeoCoordinate[],
): MapProjection {
  const innerWidth = MAP_WIDTH - MAP_PADDING_X * 2;
  if (coordinates.length === 0) {
    return {
      width: MAP_WIDTH,
      height: MIN_INNER_HEIGHT + MAP_PADDING_Y * 2,
      zoom: SINGLE_POINT_ZOOM,
      originX: 0,
      originY: 0,
      points: [],
    };
  }

  const xs = coordinates.map(c => lngToWorldX(c.lng, 0));
  const ys = coordinates.map(c => latToWorldY(c.lat, 0));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const hasX = spanX > EPSILON;
  const hasY = spanY > EPSILON;

  const aspect = hasX && hasY ? spanY / spanX : hasY ? Infinity : 0;
  const innerHeight = Math.min(
    MAX_INNER_HEIGHT,
    Math.max(MIN_INNER_HEIGHT, innerWidth * aspect),
  );
  const height = innerHeight + MAP_PADDING_Y * 2;

  const fitScale = Math.min(
    hasX ? innerWidth / spanX : Infinity,
    hasY ? innerHeight / spanY : Infinity,
  );
  const zoom = Number.isFinite(fitScale)
    ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(Math.log2(fitScale))))
    : SINGLE_POINT_ZOOM;

  const scale = 2 ** zoom;
  const originX = ((minX + maxX) / 2) * scale - MAP_WIDTH / 2;
  const originY = ((minY + maxY) / 2) * scale - height / 2;

  return {
    width: MAP_WIDTH,
    height,
    zoom,
    originX,
    originY,
    points: coordinates.map(({ lat, lng }) => ({
      x: lngToWorldX(lng, zoom) - originX,
      y: latToWorldY(lat, zoom) - originY,
    })),
  };
}
