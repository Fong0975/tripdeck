import { TILE_SIZE, type MapProjection } from './mapProjection';

/** Attribution OpenStreetMap requires wherever its tiles are shown. */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/** One map tile that intersects the drawing surface. */
export interface TileRef {
  url: string;
  /** Where the tile's top-left corner lands on the surface, in logical pixels. */
  dx: number;
  dy: number;
}

/**
 * URL of a standard OpenStreetMap tile.
 *
 * @param zoom - Zoom level.
 * @param x - Tile column, already wrapped into `0..2^zoom-1`.
 * @param y - Tile row, within `0..2^zoom-1`.
 */
export function tileUrl(zoom: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

/**
 * Lists the tiles that cover the drawing surface. Columns wrap around the
 * antimeridian; rows outside the world are dropped.
 *
 * @param projection - The projection whose surface the tiles must cover.
 */
export function listTiles(projection: MapProjection): TileRef[] {
  const { zoom, originX, originY, width, height } = projection;
  const worldTiles = 2 ** zoom;
  const firstColumn = Math.floor(originX / TILE_SIZE);
  const lastColumn = Math.ceil((originX + width) / TILE_SIZE) - 1;
  const firstRow = Math.floor(originY / TILE_SIZE);
  const lastRow = Math.ceil((originY + height) / TILE_SIZE) - 1;

  const tiles: TileRef[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    if (row < 0 || row >= worldTiles) {
      continue;
    }
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const wrapped = ((column % worldTiles) + worldTiles) % worldTiles;
      tiles.push({
        url: tileUrl(zoom, wrapped, row),
        dx: column * TILE_SIZE - originX,
        dy: row * TILE_SIZE - originY,
      });
    }
  }
  return tiles;
}
