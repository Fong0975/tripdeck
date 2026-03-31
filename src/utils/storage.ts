import { differenceInCalendarDays, parseISO, format } from 'date-fns';

import type { Trip, TripContent, DayPlan } from '@/types';

const TRIPS_KEY = 'tripdeck_trips';
const tripContentKey = (id: string) => `tripdeck_trip_${id}`;

// --- Trips list ---

export function getTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export function addTrip(trip: Trip): void {
  const trips = getTrips();
  trips.push(trip);
  saveTrips(trips);
}

export function deleteTrip(id: string): void {
  const trips = getTrips().filter(t => t.id !== id);
  saveTrips(trips);
  localStorage.removeItem(tripContentKey(id));
}

// --- Trip content ---

export function getTripContent(tripId: string): TripContent | null {
  try {
    const raw = localStorage.getItem(tripContentKey(tripId));
    return raw ? (JSON.parse(raw) as TripContent) : null;
  } catch {
    return null;
  }
}

export function saveTripContent(content: TripContent): void {
  localStorage.setItem(tripContentKey(content.tripId), JSON.stringify(content));
}

/**
 * Initializes trip content with empty day plans based on trip date range.
 */
export function initTripContent(trip: Trip): TripContent {
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  const days: DayPlan[] = Array.from({ length: totalDays }, (_, i) => ({
    day: i + 1,
    date: format(new Date(start.getTime() + i * 86400000), 'yyyy-MM-dd'),
    attractions: [],
    connections: [],
  }));

  const content: TripContent = { tripId: trip.id, days };
  saveTripContent(content);
  return content;
}

export function getOrInitTripContent(trip: Trip): TripContent {
  return getTripContent(trip.id) ?? initTripContent(trip);
}

/**
 * Fetches seed JSON files from /records/ and populates localStorage.
 * Only runs when no trips exist yet.
 */
export async function seedFromFiles(): Promise<void> {
  if (getTrips().length > 0) {
    return;
  }

  const tripsRes = await fetch('/records/trips.json');
  const trips: Trip[] = await tripsRes.json();
  saveTrips(trips);

  await Promise.all(
    trips.map(async trip => {
      const res = await fetch(`/records/trip_${trip.id}.json`);
      const content: TripContent = await res.json();
      saveTripContent(content);
    }),
  );
}
