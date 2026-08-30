import { useState, useEffect, useCallback } from 'react';

import { showToast } from '@/lib/toast';
import type { Trip } from '@/types';
import { getTrips, deleteTrip } from '@/utils/storage';

export function useHomeData() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadTrips = useCallback(async () => {
    setTrips(await getTrips());
    setLoading(false);
  }, []);

  useEffect(() => {
    void reloadTrips();
  }, [reloadTrips]);

  const handleTripAdded = (trip: Trip) => {
    setTrips(prev => [...prev, trip]);
  };

  const handleDeleteTrip = async (id: number) => {
    try {
      await deleteTrip(id);
      setTrips(prev => prev.filter(t => t.id !== id));
      showToast('success', '已刪除旅程。');
    } catch {
      showToast('error', '刪除旅程失敗，請稍後再試');
    }
  };

  const handleTripUpdated = (trip: Trip) => {
    setTrips(prev => prev.map(t => (t.id === trip.id ? trip : t)));
  };

  return {
    trips,
    loading,
    handleTripAdded,
    handleDeleteTrip,
    handleTripUpdated,
    reloadTrips,
  };
}
