import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getWeatherEnabled } from '@/utils/weatherApi';

import { useWeatherEnabled } from './useWeatherEnabled';

vi.mock('@/utils/weatherApi', () => ({ getWeatherEnabled: vi.fn() }));

describe('useWeatherEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts as false before the status resolves', () => {
    vi.mocked(getWeatherEnabled).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWeatherEnabled());

    expect(result.current).toBe(false);
  });

  it.each([true, false])('reflects the resolved status %s', async resolved => {
    vi.mocked(getWeatherEnabled).mockResolvedValue(resolved);

    const { result } = renderHook(() => useWeatherEnabled());

    await waitFor(() => expect(getWeatherEnabled).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBe(resolved));
  });

  it('ignores a status that resolves after unmount', async () => {
    let resolve: (value: boolean) => void = () => {};
    vi.mocked(getWeatherEnabled).mockReturnValue(
      new Promise(r => {
        resolve = r;
      }),
    );

    const { result, unmount } = renderHook(() => useWeatherEnabled());
    unmount();
    resolve(true);
    await Promise.resolve();

    expect(result.current).toBe(false);
  });
});
