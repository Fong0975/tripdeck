import { useState, useEffect, useCallback } from 'react';

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
    await deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
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
