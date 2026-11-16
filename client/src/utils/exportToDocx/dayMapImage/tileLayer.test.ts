import { describe, expect, it } from 'vitest';

import { TILE_SIZE, type MapProjection } from './mapProjection';
import { listTiles, tileUrl } from './tileLayer';

function makeProjection(overrides: Partial<MapProjection>): MapProjection {
  return {
    width: 602,
    height: 300,
    zoom: 2,
    originX: 0,
    originY: 0,
    points: [],
    ...overrides,
  };
}

describe('tileUrl', () => {
  it('points at the standard OpenStreetMap tile server', () => {
    expect(tileUrl(15, 27000, 14000)).toBe(
      'https://tile.openstreetmap.org/15/27000/14000.png',
    );
  });
});

describe('listTiles', () => {
  it('covers an aligned surface with a grid of tiles from the corner', () => {
    const tiles = listTiles(makeProjection({}));

    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toEqual({ url: tileUrl(2, 0, 0), dx: 0, dy: 0 });
    expect(tiles[5]).toEqual({
      url: tileUrl(2, 2, 1),
      dx: 2 * TILE_SIZE,
      dy: TILE_SIZE,
    });
  });

  it('offsets tiles by the view origin', () => {
    const tiles = listTiles(
      makeProjection({ zoom: 3, originX: 100, originY: 50 }),
    );

    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toEqual({ url: tileUrl(3, 0, 0), dx: -100, dy: -50 });
    expect(tiles[1].dx).toBe(TILE_SIZE - 100);
  });

  it('wraps columns across the antimeridian', () => {
    const tiles = listTiles(makeProjection({ originX: -100 }));

    expect(tiles[0]).toEqual({
      url: tileUrl(2, 3, 0),
      dx: -TILE_SIZE + 100,
      dy: 0,
    });
    expect(tiles.map(t => t.url)).toContain(tileUrl(2, 0, 0));
  });

  it.each([
    {
      name: 'above the world',
      projection: { originY: -100, height: 200 },
      rows: [0],
    },
    {
      name: 'below the world',
      projection: { zoom: 1, originY: 300, height: 300 },
      rows: [1],
    },
  ])('drops rows $name', ({ projection, rows }) => {
    const tiles = listTiles(makeProjection(projection));

    const usedRows = new Set(
      tiles.map(t => Number(t.url.split('/').pop()?.replace('.png', ''))),
    );
    expect([...usedRows]).toEqual(rows);
  });
});
