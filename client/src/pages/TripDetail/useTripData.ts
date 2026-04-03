import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Trip, TripContent } from '@/types';
import {
  getTrips,
  getOrInitTripContent,
  forceReloadTrips,
  forceReloadTripContent,
} from '@/utils/storage';

export function useTripData(id: string | undefined) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [content, setContent] = useState<TripContent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    const load = async () => {
      const trips = await getTrips();
      const found = trips.find(t => t.id === id);
      if (!found) {
        navigate('/');
        return;
      }
      setTrip(found);
      setContent(await getOrInitTripContent(found));
    };
    void load();
  }, [id, navigate]);

  const handleForceRefresh = async () => {
    if (!id || !trip) {
      return;
    }
    setRefreshing(true);
    try {
      const [trips, freshContent] = await Promise.all([
        forceReloadTrips(),
        forceReloadTripContent(trip),
      ]);
      const found = trips.find(t => t.id === id);
      if (!found) {
        navigate('/');
        return;
      }
      setTrip(found);
      setContent(freshContent);
    } finally {
      setRefreshing(false);
    }
  };

  return { trip, content, setContent, refreshing, handleForceRefresh };
}
