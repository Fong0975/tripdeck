import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Trip, TripContent } from '@/types';
import { getTrip, getTripContent } from '@/utils/storage';

export function useTripData(id: string | undefined) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [content, setContent] = useState<TripContent | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    const tripId = Number(id);
    if (isNaN(tripId)) {
      navigate('/');
      return;
    }
    const load = async () => {
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
    };
    void load();
  }, [id, navigate]);

  const reloadContent = async () => {
    if (!id) {
      return;
    }
    const fresh = await getTripContent(Number(id));
    setContent(fresh);
  };

  return { trip, content, reloadContent };
}
