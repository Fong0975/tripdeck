import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMapsStatus, type MapsStatus } from '@/api/maps';

import {
  __resetMapsApiForTests,
  getMapsStatusOnce,
  markMapsExhausted,
  subscribeMapsStatus,
  toMapsAvailability,
} from './index';

vi.mock('@/api/maps', () => ({ getMapsStatus: vi.fn() }));

function makeStatus(overrides: Partial<MapsStatus> = {}): MapsStatus {
  return {
    enabled: true,
    exhausted: false,
    geocodeExhausted: false,
    resetAt: '2026-10-25T07:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  __resetMapsApiForTests();
});

describe('getMapsStatusOnce', () => {
  it('resolves the backend status', async () => {
    const status = makeStatus();
    vi.mocked(getMapsStatus).mockResolvedValue(status);

    await expect(getMapsStatusOnce()).resolves.toBe(status);
  });

  it('resolves null when the status request fails', async () => {
    vi.mocked(getMapsStatus).mockRejectedValue(new Error('API error 500'));

    await expect(getMapsStatusOnce()).resolves.toBeNull();
  });

  it('requests the status only once per page load, even across concurrent calls', async () => {
    vi.mocked(getMapsStatus).mockResolvedValue(makeStatus());

    await Promise.all([getMapsStatusOnce(), getMapsStatusOnce()]);
    await getMapsStatusOnce();

    expect(getMapsStatus).toHaveBeenCalledTimes(1);
  });

  it('does not retry after a failure within the same page load', async () => {
    vi.mocked(getMapsStatus).mockRejectedValue(new Error('down'));

    await getMapsStatusOnce();
    await getMapsStatusOnce();

    expect(getMapsStatus).toHaveBeenCalledTimes(1);
  });
});

describe('markMapsExhausted', () => {
  it('replaces the memoized status with an exhausted one', async () => {
    vi.mocked(getMapsStatus).mockResolvedValue(makeStatus());
    await getMapsStatusOnce();

    markMapsExhausted('2026-10-25T07:00:00.000Z');

    await expect(getMapsStatusOnce()).resolves.toEqual({
      enabled: true,
      exhausted: true,
      geocodeExhausted: true,
      resetAt: '2026-10-25T07:00:00.000Z',
    });
    expect(getMapsStatus).toHaveBeenCalledTimes(1);
  });

  it('notifies every subscriber, and not one that unsubscribed', () => {
    const kept = vi.fn();
    const dropped = vi.fn();
    subscribeMapsStatus(kept);
    subscribeMapsStatus(dropped)();

    markMapsExhausted(null);

    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
  });

  it('forgets subscribers on reset', () => {
    const listener = vi.fn();
    subscribeMapsStatus(listener);

    __resetMapsApiForTests();
    markMapsExhausted(null);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('toMapsAvailability', () => {
  it.each([
    {
      description: 'no status (request failed)',
      status: null,
      expected: { state: 'unavailable' },
    },
    {
      description: 'a feature that is not configured',
      status: makeStatus({ enabled: false }),
      expected: { state: 'unavailable' },
    },
    {
      description: 'a feature with quota left',
      status: makeStatus(),
      expected: { state: 'ready' },
    },
    {
      description: 'a feature whose map loads are exhausted',
      status: makeStatus({ exhausted: true }),
      expected: { state: 'exhausted', resetAt: '2026-10-25T07:00:00.000Z' },
    },
    {
      description: 'exhausted name lookups only',
      status: makeStatus({ geocodeExhausted: true }),
      expected: { state: 'ready' },
    },
    {
      description: 'an exhausted feature without a reset time',
      status: makeStatus({ exhausted: true, resetAt: null }),
      expected: { state: 'exhausted', resetAt: null },
    },
  ])('maps $description', ({ status, expected }) => {
    expect(toMapsAvailability(status)).toEqual(expected);
  });
});
