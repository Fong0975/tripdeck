import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { showToast } from '@/components/ui/toast';
import type { Trip, TripContent } from '@/types';
import { getTrip, getTripContent } from '@/utils/storage';

/**
 * Loads a trip and its itinerary content for the trip detail page.
 *
 * A missing trip (404) redirects home; any other load failure sets
 * `loadError` so the page can offer `retryLoad`. `reloadContent` refetches
 * only the content and, on failure, keeps the previously loaded content and
 * shows an error toast instead of blanking the page.
 *
 * @param id The raw `:id` route param.
 */
export function useTripData(id: string | undefined) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [content, setContent] = useState<TripContent | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const tripId = Number(id);
    if (isNaN(tripId)) {
      navigate('/');
      return;
    }
    setLoadError(false);
    try {
      const [fetchedTrip, fetchedContent] = await Promise.all([
        getTrip(tripId),
        getTripContent(tripId),
      ]);
      if (!fetchedTrip || !fetchedContent) {
        navigate('/');
        return;
      }
      setTrip(fetchedTrip);
      setContent(fetchedContent);
    } catch {
      setLoadError(true);
      showToast('error', '載入旅程資料失敗，請稍後再試');
    }
  }, [id, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void load();
  }, [load]);

  /**
   * Refetches the trip content. Always resolves: on failure (including a
   * 404) the previous content is kept and an error toast is shown.
   */
  const reloadContent = async (): Promise<void> => {
    if (!id) {
      return;
    }
    const fresh = await getTripContent(Number(id)).catch(() => null);
    if (!fresh) {
      showToast('error', '重新載入行程內容失敗，請稍後再試');
      return;
    }
    setContent(fresh);
  };

  /**
   * Refetches the trip itself (e.g. after its images changed). Always
   * resolves: on failure the previous trip is kept and an error toast is
   * shown.
   */
  const reloadTrip = async (): Promise<void> => {
    if (!id) {
      return;
    }
    const fresh = await getTrip(Number(id)).catch(() => null);
    if (!fresh) {
      showToast('error', '重新載入旅程資料失敗，請稍後再試');
      return;
    }
    setTrip(fresh);
  };

  return {
    trip,
    content,
    reloadContent,
    reloadTrip,
    setTrip,
    loadError,
    retryLoad: load,
  };
}
