import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTiles, TILE_TIMEOUT_MS } from './loadTiles';
import type { TileRef } from './tileLayer';

/** How a fake image behaves once its source is set, chosen by URL. */
type Behavior = 'load' | 'error' | 'hang';

const instances: FakeImage[] = [];

class FakeImage {
  crossOrigin = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private currentSrc = '';

  constructor() {
    instances.push(this);
  }

  get src(): string {
    return this.currentSrc;
  }

  set src(value: string) {
    this.currentSrc = value;
    const behavior: Behavior = value.includes('broken')
      ? 'error'
      : value.includes('slow')
        ? 'hang'
        : 'load';
    if (behavior === 'load') {
      queueMicrotask(() => this.onload?.());
    } else if (behavior === 'error') {
      queueMicrotask(() => this.onerror?.());
    }
  }
}

function tile(name: string, dx = 0, dy = 0): TileRef {
  return { url: `https://tiles.test/${name}.png`, dx, dy };
}

beforeEach(() => {
  instances.length = 0;
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('loadTiles', () => {
  it('returns each loaded tile with its offset, in input order', async () => {
    const loaded = await loadTiles([tile('a', 1, 2), tile('b', 3, 4)]);

    expect(loaded.map(({ dx, dy }) => [dx, dy])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(loaded.map(t => (t.image as unknown as FakeImage).src)).toEqual([
      'https://tiles.test/a.png',
      'https://tiles.test/b.png',
    ]);
  });

  it('requests tiles with CORS so the canvas stays exportable', async () => {
    await loadTiles([tile('a')]);

    expect(instances[0].crossOrigin).toBe('anonymous');
  });

  it('leaves out tiles that fail to load', async () => {
    const loaded = await loadTiles([tile('a', 1, 1), tile('broken', 2, 2)]);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].dx).toBe(1);
  });

  it('leaves out tiles that take longer than the timeout', async () => {
    vi.useFakeTimers();

    const pending = loadTiles([tile('a', 1, 1), tile('slow', 2, 2)]);
    await vi.advanceTimersByTimeAsync(TILE_TIMEOUT_MS);
    const loaded = await pending;

    expect(loaded).toHaveLength(1);
    expect(loaded[0].dx).toBe(1);
  });

  it('returns nothing when there are no tiles', async () => {
    await expect(loadTiles([])).resolves.toEqual([]);
  });
});
