import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';
import { deleteTrip, getTrips } from '@/utils/storage';

import { useHomeData } from './useHomeData';

vi.mock('@/utils/storage', () => ({
  getTrips: vi.fn(),
  deleteTrip: vi.fn(),
}));

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Trip',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('useHomeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in a loading state and loads trips once getTrips resolves', async () => {
    const trips = [makeTrip()];
    vi.mocked(getTrips).mockResolvedValue(trips);

    const { result } = renderHook(() => useHomeData());

    expect(result.current.loading).toBe(true);
    expect(result.current.trips).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.trips).toEqual(trips);
  });

  it('appends a trip to local state without calling the API', async () => {
    vi.mocked(getTrips).mockResolvedValue([]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTrip = makeTrip({ id: 2, title: 'New Trip' });
    act(() => {
      result.current.handleTripAdded(newTrip);
    });

    expect(result.current.trips).toEqual([newTrip]);
    expect(getTrips).toHaveBeenCalledTimes(1);
  });

  it('calls deleteTrip with the given id', async () => {
    const trip = makeTrip();
    vi.mocked(getTrips).mockResolvedValue([trip]);
    vi.mocked(deleteTrip).mockResolvedValue(undefined);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDeleteTrip(1);
    });

    expect(deleteTrip).toHaveBeenCalledWith(1);
  });

  it('removes the deleted trip from local state', async () => {
    const trip = makeTrip();
    const otherTrip = makeTrip({ id: 2, title: 'Other' });
    vi.mocked(getTrips).mockResolvedValue([trip, otherTrip]);
    vi.mocked(deleteTrip).mockResolvedValue(undefined);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([trip, otherTrip]);
    });

    await act(async () => {
      await result.current.handleDeleteTrip(1);
    });

    expect(result.current.trips).toEqual([otherTrip]);
  });
});
