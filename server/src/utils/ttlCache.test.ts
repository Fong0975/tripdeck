import { describe, expect, it } from 'vitest';

import { TtlCache } from './ttlCache';

describe('TtlCache', () => {
  function createCache(maxEntries = 2) {
    const clock = { time: 1_000 };
    const cache = new TtlCache<string | null>(
      100,
      maxEntries,
      () => clock.time,
    );
    return { cache, clock };
  }

  it('returns undefined on a miss and the stored value on a hit', () => {
    const { cache } = createCache();

    expect(cache.get('a')).toBeUndefined();
    cache.set('a', 'value');
    expect(cache.get('a')).toBe('value');
  });

  it('stores null so negative results can be cached', () => {
    const { cache } = createCache();

    cache.set('a', null);

    expect(cache.get('a')).toBeNull();
  });

  it.each([
    { elapsed: 99, expected: 'value' },
    { elapsed: 100, expected: undefined },
    { elapsed: 500, expected: undefined },
  ])('returns $expected after $elapsed ms', ({ elapsed, expected }) => {
    const { cache, clock } = createCache();
    cache.set('a', 'value');

    clock.time += elapsed;

    expect(cache.get('a')).toBe(expected);
  });

  it('evicts the oldest entry when full', () => {
    const { cache } = createCache(2);
    cache.set('a', '1');
    cache.set('b', '2');

    cache.set('c', '3');

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('does not evict when overwriting an existing key at capacity', () => {
    const { cache } = createCache(2);
    cache.set('a', '1');
    cache.set('b', '2');

    cache.set('a', 'updated');

    expect(cache.get('a')).toBe('updated');
    expect(cache.get('b')).toBe('2');
  });

  it('clear removes every entry', () => {
    const { cache } = createCache();
    cache.set('a', '1');

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
  });

  it('uses the real clock by default', () => {
    const cache = new TtlCache<number>(60_000, 10);

    cache.set('a', 1);

    expect(cache.get('a')).toBe(1);
  });
});
