import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { showToast } from '@/lib/toast';
import type { Trip, TripContent } from '@/types';
import { getTrip, getTripContent } from '@/utils/storage';

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
      if (!fetchedTrip) {
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
    void load();
  }, [load]);

  const reloadContent = async () => {
    if (!id) {
      return;
    }
    const fresh = await getTripContent(Number(id));
    setContent(fresh);
  };

  return { trip, content, reloadContent, setTrip, loadError, retryLoad: load };
}
