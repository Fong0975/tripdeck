import { useState, useEffect } from 'react';

import type { Trip } from '@/types';
import { getTrips, deleteTrip, forceReloadTrips } from '@/utils/storage';

export function useHomeData() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setTrips(await getTrips());
      setLoading(false);
    };
    void load();
  }, []);

  const handleTripAdded = (trip: Trip) => {
    setTrips(prev => [...prev, trip]);
  };

  const handleDeleteTrip = async (id: string) => {
    await deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
  };

  const handleForceReload = async () => {
    setRefreshing(true);
    try {
      setTrips(await forceReloadTrips());
    } finally {
      setRefreshing(false);
    }
  };

  return {
    trips,
    loading,
    refreshing,
    handleTripAdded,
    handleDeleteTrip,
    handleForceReload,
  };
}
