import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import { makeContent, makeDay, makeTrip } from '@/test-utils/fixtures';
import { getTrip, getTripContent } from '@/utils/storage';

import { useTripData } from './useTripData';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/utils/storage');

vi.mock('@/lib/toast');

describe('useTripData', () => {
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
    vi.mocked(getTripContent).mockResolvedValue(makeContent([]));

    const { result } = renderHook(() => useTripData('1'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(result.current.trip).toBeNull();
  });

  it('loads the trip and content for a valid numeric id', async () => {
    const trip = makeTrip();
    const content = makeContent([]);
    vi.mocked(getTrip).mockResolvedValue(trip);
    vi.mocked(getTripContent).mockResolvedValue(content);

    const { result } = renderHook(() => useTripData('1'));

    await waitFor(() => {
      expect(result.current.trip).toEqual(trip);
    });
    expect(result.current.content).toEqual(content);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('load failure', () => {
    it('sets loadError and shows a toast when fetching fails, then recovers via retryLoad', async () => {
      const trip = makeTrip();
      const content = makeContent([]);
      vi.mocked(getTrip).mockRejectedValueOnce(new Error('network error'));
      vi.mocked(getTripContent).mockResolvedValue(content);

      const { result } = renderHook(() => useTripData('1'));

      await waitFor(() => {
        expect(result.current.loadError).toBe(true);
      });
      expect(result.current.trip).toBeNull();
      expect(result.current.content).toBeNull();
      expect(showToast).toHaveBeenCalledWith(
        'error',
        '載入旅程資料失敗，請稍後再試',
      );

      vi.mocked(getTrip).mockResolvedValue(trip);

      await act(async () => {
        await result.current.retryLoad();
      });

      expect(result.current.loadError).toBe(false);
      expect(result.current.trip).toEqual(trip);
      expect(result.current.content).toEqual(content);
    });
  });

  describe('reloadContent', () => {
    it('does nothing when id is undefined', async () => {
      const { result } = renderHook(() => useTripData(undefined));

      await result.current.reloadContent();

      expect(getTripContent).not.toHaveBeenCalled();
    });

    it('refetches and replaces content for a valid id', async () => {
      const trip = makeTrip();
      const initialContent = makeContent([]);
      const refreshedContent = makeContent([makeDay()]);
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
      const content = makeContent([]);
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
