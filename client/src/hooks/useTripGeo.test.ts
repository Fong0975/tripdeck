import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolveGeoResult } from '@/api/maps';
import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import {
  needsGeoResolution,
  resolveDayGeo,
  withResolvedGeo,
} from '@/utils/mapsApi/geoCache';

import { useTripGeo } from './useTripGeo';

vi.mock('@/utils/mapsApi/geoCache', () => ({
  needsGeoResolution: vi.fn(),
  resolveDayGeo: vi.fn(),
  withResolvedGeo: vi.fn(),
}));

const DAYS = [
  makeDay({ id: 10, attractions: [makeAttraction({ id: 1 })] }),
  makeDay({ id: 20 }),
];

function makeResult(geocodeExhausted = false): ResolveGeoResult {
  return { attractions: [], geocodeExhausted };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderGeo(activeDayId: number | undefined) {
  return renderHook(({ dayId }) => useTripGeo(7, DAYS, dayId), {
    initialProps: { dayId: activeDayId },
  });
}

beforeEach(() => {
  vi.mocked(needsGeoResolution).mockReturnValue(true);
  vi.mocked(resolveDayGeo).mockResolvedValue(makeResult());
  vi.mocked(withResolvedGeo).mockImplementation(days => days);
});

describe('useTripGeo', () => {
  it.each([
    {
      description: 'everything is already resolved',
      needed: false,
      dayId: 10,
    },
    { description: 'no day is selected', needed: true, dayId: undefined },
  ])('makes no request when $description', ({ needed, dayId }) => {
    vi.mocked(needsGeoResolution).mockReturnValue(needed);

    const { result } = renderGeo(dayId);

    expect(resolveDayGeo).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      resolving: false,
      failed: false,
      geocodeExhausted: false,
      days: DAYS,
    });
  });

  it('resolves for the selected day and reports progress', async () => {
    const pending = deferred<ResolveGeoResult | null>();
    vi.mocked(resolveDayGeo).mockReturnValue(pending.promise);

    const { result } = renderGeo(10);

    await waitFor(() => expect(result.current.resolving).toBe(true));
    expect(resolveDayGeo).toHaveBeenCalledWith(7, 10, DAYS);

    await act(async () => pending.resolve(makeResult()));

    expect(result.current).toMatchObject({ resolving: false, failed: false });
  });

  it('re-merges the resolved locations once a request finishes', async () => {
    const merged = [makeDay({ id: 99 })];
    vi.mocked(withResolvedGeo)
      .mockReturnValueOnce(DAYS)
      .mockReturnValue(merged);

    const { result } = renderGeo(10);

    await waitFor(() => expect(result.current.days).toBe(merged));
  });

  it.each([true, false])(
    'reports geocodeExhausted=%s from the backend result',
    async exhausted => {
      vi.mocked(resolveDayGeo).mockResolvedValue(makeResult(exhausted));

      const { result } = renderGeo(10);

      await waitFor(() => expect(result.current.resolving).toBe(false));
      expect(result.current.geocodeExhausted).toBe(exhausted);
    },
  );

  it('keeps the exhausted flag when a repeated request is skipped', async () => {
    vi.mocked(resolveDayGeo)
      .mockResolvedValueOnce(makeResult(true))
      .mockResolvedValueOnce(null);
    const { result, rerender } = renderGeo(10);
    await waitFor(() => expect(result.current.geocodeExhausted).toBe(true));

    rerender({ dayId: 20 });

    await waitFor(() => expect(resolveDayGeo).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.geocodeExhausted).toBe(true);
  });

  it('flags a failed request and clears the flag on the next success', async () => {
    vi.mocked(resolveDayGeo)
      .mockRejectedValueOnce(new Error('API error 500'))
      .mockResolvedValueOnce(makeResult());
    const { result, rerender } = renderGeo(10);

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.resolving).toBe(false);

    rerender({ dayId: 20 });

    await waitFor(() => expect(result.current.failed).toBe(false));
  });

  it('requests again when the selected day changes', async () => {
    const { rerender } = renderGeo(10);
    await waitFor(() => expect(resolveDayGeo).toHaveBeenCalledTimes(1));

    rerender({ dayId: 20 });

    await waitFor(() =>
      expect(resolveDayGeo).toHaveBeenLastCalledWith(7, 20, DAYS),
    );
  });

  it.each([
    {
      description: 'a result',
      settle: (p: ReturnType<typeof deferred<ResolveGeoResult | null>>) =>
        p.resolve(makeResult()),
    },
    {
      description: 'a failure',
      settle: (p: ReturnType<typeof deferred<ResolveGeoResult | null>>) =>
        p.reject(new Error('late')),
    },
  ])('ignores $description arriving after unmount', async ({ settle }) => {
    const pending = deferred<ResolveGeoResult | null>();
    vi.mocked(resolveDayGeo).mockReturnValue(pending.promise);
    const { result, unmount } = renderGeo(10);
    await waitFor(() => expect(result.current.resolving).toBe(true));

    unmount();
    settle(pending);
    await Promise.resolve();

    expect(result.current.resolving).toBe(true);
  });
});
