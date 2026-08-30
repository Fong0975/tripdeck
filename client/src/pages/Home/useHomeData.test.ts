import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import type { Trip } from '@/types';
import { deleteTrip, getTrips } from '@/utils/storage';

import { useHomeData } from './useHomeData';

vi.mock('@/utils/storage', () => ({
  getTrips: vi.fn(),
  deleteTrip: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
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

  it('re-fetches trips from the API when reloadTrips is called again', async () => {
    const initial = [makeTrip({ id: 1, title: 'Trip A' })];
    const updated = [
      makeTrip({ id: 1, title: 'Trip A' }),
      makeTrip({ id: 2, title: 'Trip B' }),
    ];
    vi.mocked(getTrips)
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(updated);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual(initial);
    });

    await act(async () => {
      await result.current.reloadTrips();
    });

    expect(getTrips).toHaveBeenCalledTimes(2);
    expect(result.current.trips).toEqual(updated);
  });

  it('adds a trip to local state without calling the API', async () => {
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

  it('inserts a newly added trip at the front when its startDate is the newest', async () => {
    const older = makeTrip({ id: 1, startDate: '2026-01-01' });
    vi.mocked(getTrips).mockResolvedValue([older]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([older]);
    });

    const newer = makeTrip({ id: 2, startDate: '2026-06-01' });
    act(() => {
      result.current.handleTripAdded(newer);
    });

    expect(result.current.trips).toEqual([newer, older]);
  });

  it('inserts a newly added trip at the end when its startDate is the oldest', async () => {
    const newer = makeTrip({ id: 1, startDate: '2026-06-01' });
    vi.mocked(getTrips).mockResolvedValue([newer]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([newer]);
    });

    const older = makeTrip({ id: 2, startDate: '2026-01-01' });
    act(() => {
      result.current.handleTripAdded(older);
    });

    expect(result.current.trips).toEqual([newer, older]);
  });

  it('inserts a newly added trip between two existing trips by startDate', async () => {
    const newest = makeTrip({ id: 1, startDate: '2026-09-01' });
    const oldest = makeTrip({ id: 2, startDate: '2026-01-01' });
    vi.mocked(getTrips).mockResolvedValue([newest, oldest]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([newest, oldest]);
    });

    const middle = makeTrip({ id: 3, startDate: '2026-05-01' });
    act(() => {
      result.current.handleTripAdded(middle);
    });

    expect(result.current.trips).toEqual([newest, middle, oldest]);
  });

  it('places a newly added trip before an existing trip with the same startDate', async () => {
    const existing = makeTrip({ id: 1, startDate: '2026-03-01' });
    vi.mocked(getTrips).mockResolvedValue([existing]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([existing]);
    });

    const sameDate = makeTrip({ id: 2, startDate: '2026-03-01' });
    act(() => {
      result.current.handleTripAdded(sameDate);
    });

    expect(result.current.trips).toEqual([sameDate, existing]);
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
    expect(showToast).toHaveBeenCalledWith('success', '已刪除旅程。');
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

  it('shows an error toast and keeps the trip in local state when deleteTrip fails', async () => {
    const trip = makeTrip();
    const otherTrip = makeTrip({ id: 2, title: 'Other' });
    vi.mocked(getTrips).mockResolvedValue([trip, otherTrip]);
    vi.mocked(deleteTrip).mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([trip, otherTrip]);
    });

    await act(async () => {
      await result.current.handleDeleteTrip(1);
    });

    expect(result.current.trips).toEqual([trip, otherTrip]);
    expect(showToast).toHaveBeenCalledWith('error', '刪除旅程失敗，請稍後再試');
  });

  it('replaces the matching trip in local state without calling the API', async () => {
    const trip = makeTrip();
    const otherTrip = makeTrip({ id: 2, title: 'Other' });
    vi.mocked(getTrips).mockResolvedValue([trip, otherTrip]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([trip, otherTrip]);
    });

    const updatedTrip = makeTrip({ title: 'Renamed' });
    act(() => {
      result.current.handleTripUpdated(updatedTrip);
    });

    expect(result.current.trips).toEqual([updatedTrip, otherTrip]);
  });

  it('repositions a trip when editing moves its startDate past another trip', async () => {
    const trip = makeTrip({ id: 1, startDate: '2026-01-01' });
    const otherTrip = makeTrip({
      id: 2,
      title: 'Other',
      startDate: '2026-06-01',
    });
    vi.mocked(getTrips).mockResolvedValue([otherTrip, trip]);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => {
      expect(result.current.trips).toEqual([otherTrip, trip]);
    });

    const updatedTrip = makeTrip({ id: 1, startDate: '2026-09-01' });
    act(() => {
      result.current.handleTripUpdated(updatedTrip);
    });

    expect(result.current.trips).toEqual([updatedTrip, otherTrip]);
  });
});
