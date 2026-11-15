import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { makeContent, makeDay, makeTrip } from '@/test-utils/fixtures';
import { getTrip, getTripContent } from '@/utils/storage';

import { useTripData } from './useTripData';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/utils/storage');

vi.mock('@/components/ui/toast');

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

  it.each([
    {
      description: 'the trip is not found',
      trip: null,
      content: makeContent([]),
    },
    {
      description: 'the trip content is not found',
      trip: makeTrip(),
      content: null,
    },
  ])('navigates home when $description', async ({ trip, content }) => {
    vi.mocked(getTrip).mockResolvedValue(trip);
    vi.mocked(getTripContent).mockResolvedValue(content);

    const { result } = renderHook(() => useTripData('1'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(result.current.trip).toBeNull();
    expect(result.current.loadError).toBe(false);
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
    it.each([
      { description: 'fetching the trip fails', failing: 'trip' },
      { description: 'fetching the content fails', failing: 'content' },
    ])(
      'sets loadError and shows a toast when $description, then recovers via retryLoad',
      async ({ failing }) => {
        const trip = makeTrip();
        const content = makeContent([]);
        vi.mocked(getTrip).mockResolvedValue(trip);
        vi.mocked(getTripContent).mockResolvedValue(content);
        if (failing === 'trip') {
          vi.mocked(getTrip).mockRejectedValueOnce(new Error('API error 500'));
        } else {
          vi.mocked(getTripContent).mockRejectedValueOnce(
            new Error('API error 500'),
          );
        }

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
      },
    );
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
      expect(showToast).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: 'the request rejects',
        mockReload: () =>
          vi
            .mocked(getTripContent)
            .mockRejectedValueOnce(new Error('API error 500')),
      },
      {
        description: 'the content is not found',
        mockReload: () => vi.mocked(getTripContent).mockResolvedValueOnce(null),
      },
    ])(
      'keeps the previous content and shows a toast when $description',
      async ({ mockReload }) => {
        const initialContent = makeContent([makeDay()]);
        vi.mocked(getTrip).mockResolvedValue(makeTrip());
        vi.mocked(getTripContent).mockResolvedValueOnce(initialContent);

        const { result } = renderHook(() => useTripData('1'));
        await waitFor(() => {
          expect(result.current.content).toEqual(initialContent);
        });

        mockReload();
        await act(async () => {
          await expect(result.current.reloadContent()).resolves.toBeUndefined();
        });

        expect(result.current.content).toEqual(initialContent);
        expect(showToast).toHaveBeenCalledWith(
          'error',
          '重新載入行程內容失敗，請稍後再試',
        );
      },
    );
  });

  describe('reloadTrip', () => {
    it('does nothing when id is undefined', async () => {
      const { result } = renderHook(() => useTripData(undefined));

      await result.current.reloadTrip();

      expect(getTrip).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: 'replaces the trip when the refetch succeeds',
        mockReload: (fresh: ReturnType<typeof makeTrip>) =>
          vi.mocked(getTrip).mockResolvedValueOnce(fresh),
        expectFresh: true,
      },
      {
        description: 'keeps the previous trip when the refetch rejects',
        mockReload: () =>
          vi.mocked(getTrip).mockRejectedValueOnce(new Error('API error 500')),
        expectFresh: false,
      },
      {
        description: 'keeps the previous trip when the trip is not found',
        mockReload: () => vi.mocked(getTrip).mockResolvedValueOnce(null),
        expectFresh: false,
      },
    ])('$description', async ({ mockReload, expectFresh }) => {
      const initialTrip = makeTrip();
      const freshTrip = { ...makeTrip(), title: 'Refreshed' };
      vi.mocked(getTrip).mockResolvedValueOnce(initialTrip);
      vi.mocked(getTripContent).mockResolvedValue(makeContent([]));

      const { result } = renderHook(() => useTripData('1'));
      await waitFor(() => {
        expect(result.current.trip).toEqual(initialTrip);
      });

      mockReload(freshTrip);
      await act(async () => {
        await expect(result.current.reloadTrip()).resolves.toBeUndefined();
      });

      expect(result.current.trip).toEqual(
        expectFresh ? freshTrip : initialTrip,
      );
      if (expectFresh) {
        expect(showToast).not.toHaveBeenCalled();
      } else {
        expect(showToast).toHaveBeenCalledWith(
          'error',
          '重新載入旅程資料失敗，請稍後再試',
        );
      }
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
