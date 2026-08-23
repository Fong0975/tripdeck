import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip, TripContent } from '@/types';
import { getTrip, getTripContent } from '@/utils/storage';

import { useTripData } from './useTripData';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/utils/storage', () => ({
  getTrip: vi.fn(),
  getTripContent: vi.fn(),
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

describe('useTripData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { description: 'id is undefined', id: undefined, expectNavigate: false },
    {
      description: 'id is a non-numeric string',
      id: 'abc',
      expectNavigate: true,
    },
  ])('does not fetch trip data when $description', ({ id, expectNavigate }) => {
    renderHook(() => useTripData(id));

    if (expectNavigate) {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    } else {
      expect(mockNavigate).not.toHaveBeenCalled();
    }
    expect(getTrip).not.toHaveBeenCalled();
  });

  it('navigates home when the fetched trip is not found', async () => {
    vi.mocked(getTrip).mockResolvedValue(null);
    vi.mocked(getTripContent).mockResolvedValue({ tripId: 1, days: [] });

    const { result } = renderHook(() => useTripData('1'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(result.current.trip).toBeNull();
  });

  it('loads the trip and content for a valid numeric id', async () => {
    const trip = makeTrip();
    const content: TripContent = { tripId: 1, days: [] };
    vi.mocked(getTrip).mockResolvedValue(trip);
    vi.mocked(getTripContent).mockResolvedValue(content);

    const { result } = renderHook(() => useTripData('1'));

    await waitFor(() => {
      expect(result.current.trip).toEqual(trip);
    });
    expect(result.current.content).toEqual(content);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('reloadContent', () => {
    it('does nothing when id is undefined', async () => {
      const { result } = renderHook(() => useTripData(undefined));

      await result.current.reloadContent();

      expect(getTripContent).not.toHaveBeenCalled();
    });

    it('refetches and replaces content for a valid id', async () => {
      const trip = makeTrip();
      const initialContent: TripContent = { tripId: 1, days: [] };
      const refreshedContent: TripContent = {
        tripId: 1,
        days: [
          {
            id: 1,
            day: 1,
            date: '2026-01-01',
            locations: [],
            attractions: [],
            connections: [],
          },
        ],
      };
      vi.mocked(getTrip).mockResolvedValue(trip);
      vi.mocked(getTripContent)
        .mockResolvedValueOnce(initialContent)
        .mockResolvedValueOnce(refreshedContent);

      const { result } = renderHook(() => useTripData('1'));
      await waitFor(() => {
        expect(result.current.content).toEqual(initialContent);
      });

      await act(async () => {
        await result.current.reloadContent();
      });

      expect(result.current.content).toEqual(refreshedContent);
    });
  });

  describe('setTrip', () => {
    it('updates the trip in state without refetching', async () => {
      const trip = makeTrip();
      const content: TripContent = { tripId: 1, days: [] };
      vi.mocked(getTrip).mockResolvedValue(trip);
      vi.mocked(getTripContent).mockResolvedValue(content);

      const { result } = renderHook(() => useTripData('1'));
      await waitFor(() => {
        expect(result.current.trip).toEqual(trip);
      });

      const updatedTrip = { ...trip, title: 'Renamed' };
      act(() => {
        result.current.setTrip(updatedTrip);
      });

      expect(result.current.trip).toEqual(updatedTrip);
      expect(getTrip).toHaveBeenCalledTimes(1);
    });
  });
});
