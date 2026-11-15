import { useState, useEffect, useCallback } from 'react';

import { showToast } from '@/components/ui/toast';
import type { Trip } from '@/types';
import { getTrips, deleteTrip } from '@/utils/storage';

/**
 * Returns `trips` with `trip` inserted at the position matching the
 * server's `ORDER BY start_date DESC, created_at DESC` sort — newest
 * `startDate` first, and among ties, `trip` sorts before any existing trip
 * with the same `startDate` (mirroring the `created_at DESC` tie-break for
 * a trip that was just added or edited, which is always the newest).
 * Any existing entry for the same trip id is replaced.
 */
function insertSortedByStartDate(trips: Trip[], trip: Trip): Trip[] {
  const rest = trips.filter(t => t.id !== trip.id);
  const insertAt = rest.findIndex(t => t.startDate <= trip.startDate);
  if (insertAt === -1) {
    return [...rest, trip];
  }
  return [...rest.slice(0, insertAt), trip, ...rest.slice(insertAt)];
}

/**
 * Loads the home page's trip list and keeps it in sync with local
 * add/update/delete actions.
 *
 * `reloadTrips` always resolves and always clears `loading`; on failure it
 * keeps the previously loaded trips, sets `loadError`, and shows an error
 * toast.
 */
export function useHomeData() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reloadTrips = useCallback(async () => {
    try {
      setTrips(await getTrips());
      setLoadError(false);
    } catch {
      setLoadError(true);
      showToast('error', '載入旅程列表失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void reloadTrips();
  }, [reloadTrips]);

  const handleTripAdded = (trip: Trip) => {
    setTrips(prev => insertSortedByStartDate(prev, trip));
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
    setTrips(prev => insertSortedByStartDate(prev, trip));
  };

  return {
    trips,
    loading,
    loadError,
    handleTripAdded,
    handleDeleteTrip,
    handleTripUpdated,
    reloadTrips,
  };
}
