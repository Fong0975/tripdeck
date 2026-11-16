import { mapWithConcurrency } from '../concurrency';

import type { TileRef } from './tileLayer';

/** A tile image ready to draw. */
export interface LoadedTile {
  image: HTMLImageElement;
  dx: number;
  dy: number;
}

/** Tiles fetched at once; OpenStreetMap asks clients to stay modest. */
const TILE_CONCURRENCY = 4;
/** How long to wait for one tile before giving up on it. */
export const TILE_TIMEOUT_MS = 8000;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    // Without CORS the canvas would be tainted and could not be exported.
    image.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), TILE_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = url;
  });
}

/**
 * Downloads map tiles with bounded concurrency. A tile that fails or times out
 * is left out, so the picture still renders (with a gap) when the network or
 * the tile server is unavailable.
 *
 * @param tiles - The tiles to download.
 * @returns The tiles that loaded, in input order.
 */
export async function loadTiles(tiles: TileRef[]): Promise<LoadedTile[]> {
  const images = await mapWithConcurrency(tiles, TILE_CONCURRENCY, tile =>
    loadImage(tile.url),
  );
  return tiles.flatMap((tile, i) => {
    const image = images[i];
    return image ? [{ image, dx: tile.dx, dy: tile.dy }] : [];
  });
}
