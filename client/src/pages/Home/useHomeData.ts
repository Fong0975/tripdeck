import { useState, useEffect } from 'react';

import type { Trip } from '@/types';
import { getTrips, deleteTrip } from '@/utils/storage';

export function useHomeData() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeleteTrip = async (id: number) => {
    await deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
  };

  return {
    trips,
    loading,
    handleTripAdded,
    handleDeleteTrip,
  };
}
