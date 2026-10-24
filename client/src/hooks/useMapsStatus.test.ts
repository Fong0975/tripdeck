import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MapsStatus } from '@/api/maps';
import {
  __resetMapsApiForTests,
  getMapsStatusOnce,
  markMapsExhausted,
} from '@/utils/mapsApi';

import { useMapsStatus } from './useMapsStatus';

vi.mock('@/utils/mapsApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/mapsApi')>()),
  getMapsStatusOnce: vi.fn(),
}));

const STATUS: MapsStatus = {
  enabled: true,
  exhausted: false,
  geocodeExhausted: false,
  resetAt: null,
};

describe('useMapsStatus', () => {
  it('starts as unavailable before the status resolves', () => {
    vi.mocked(getMapsStatusOnce).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMapsStatus());

    expect(result.current).toEqual({ state: 'unavailable' });
  });

  it.each([
    {
      description: 'ready',
      status: STATUS,
      expected: { state: 'ready' },
    },
    {
      description: 'exhausted',
      status: { ...STATUS, exhausted: true, resetAt: '2026-10-25T07:00:00Z' },
      expected: { state: 'exhausted', resetAt: '2026-10-25T07:00:00Z' },
    },
    {
      description: 'unavailable when not enabled',
      status: { ...STATUS, enabled: false },
      expected: { state: 'unavailable' },
    },
    {
      description: 'unavailable when the request failed',
      status: null,
      expected: { state: 'unavailable' },
    },
  ])('reports $description', async ({ status, expected }) => {
    vi.mocked(getMapsStatusOnce).mockResolvedValue(status);

    const { result } = renderHook(() => useMapsStatus());

    await waitFor(() => expect(result.current).toEqual(expected));
  });

  it('ignores a status that resolves after unmount', async () => {
    let resolve: (value: MapsStatus | null) => void = () => {};
    vi.mocked(getMapsStatusOnce).mockReturnValue(
      new Promise(r => {
        resolve = r;
      }),
    );

    const { result, unmount } = renderHook(() => useMapsStatus());
    unmount();
    resolve(STATUS);
    await Promise.resolve();

    expect(result.current).toEqual({ state: 'unavailable' });
  });

  describe('when the quota runs out while mounted', () => {
    const EXHAUSTED: MapsStatus = {
      ...STATUS,
      exhausted: true,
      resetAt: '2026-10-25T07:00:00Z',
    };

    afterEach(() => {
      __resetMapsApiForTests();
    });

    it('switches to exhausted', async () => {
      vi.mocked(getMapsStatusOnce)
        .mockResolvedValueOnce(STATUS)
        .mockResolvedValue(EXHAUSTED);
      const { result } = renderHook(() => useMapsStatus());
      await waitFor(() => expect(result.current).toEqual({ state: 'ready' }));

      act(() => markMapsExhausted('2026-10-25T07:00:00Z'));

      await waitFor(() =>
        expect(result.current).toEqual({
          state: 'exhausted',
          resetAt: '2026-10-25T07:00:00Z',
        }),
      );
    });

    it('stops following changes after unmount', async () => {
      vi.mocked(getMapsStatusOnce).mockResolvedValue(STATUS);
      const { result, unmount } = renderHook(() => useMapsStatus());
      await waitFor(() => expect(result.current).toEqual({ state: 'ready' }));
      unmount();
      vi.mocked(getMapsStatusOnce).mockClear();

      markMapsExhausted(null);

      expect(getMapsStatusOnce).not.toHaveBeenCalled();
    });
  });
});
