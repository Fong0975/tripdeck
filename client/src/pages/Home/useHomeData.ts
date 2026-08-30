import { useState, useEffect, useCallback } from 'react';

import { showToast } from '@/lib/toast';
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
    handleTripAdded,
    handleDeleteTrip,
    handleTripUpdated,
    reloadTrips,
  };
}
