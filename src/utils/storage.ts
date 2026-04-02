import { differenceInCalendarDays, parseISO, format } from 'date-fns';

import type { Trip, TripContent, DayPlan } from '@/types';

const SESSION_TRIPS_KEY = 'tripdeck_session_trips';
const sessionTripKey = (id: string) => `tripdeck_session_trip_${id}`;

// --- Low-level file API ---

async function fetchTripsFromFile(): Promise<Trip[]> {
  const res = await fetch('/api/records/trips');
  if (!res.ok) {
    return [];
  }
  return res.json() as Promise<Trip[]>;
}

async function writeTripsToFile(trips: Trip[]): Promise<void> {
  await fetch('/api/records/trips', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trips),
  });
}

async function fetchTripContentFromFile(
  id: string,
): Promise<TripContent | null> {
  const res = await fetch(`/api/records/trip/${id}`);
  if (!res.ok) {
    return null;
  }
  return res.json() as Promise<TripContent>;
}

async function writeTripContentToFile(content: TripContent): Promise<void> {
  await fetch(`/api/records/trip/${content.tripId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
}

async function deleteTripContentFile(id: string): Promise<void> {
  await fetch(`/api/records/trip/${id}`, { method: 'DELETE' });
}

// --- Session cache helpers ---

function getSessionTrips(): Trip[] | null {
  const raw = sessionStorage.getItem(SESSION_TRIPS_KEY);
  return raw ? (JSON.parse(raw) as Trip[]) : null;
}

function setSessionTrips(trips: Trip[]): void {
  sessionStorage.setItem(SESSION_TRIPS_KEY, JSON.stringify(trips));
}

function getSessionTripContent(id: string): TripContent | null {
  const raw = sessionStorage.getItem(sessionTripKey(id));
  return raw ? (JSON.parse(raw) as TripContent) : null;
}

function setSessionTripContent(content: TripContent): void {
  sessionStorage.setItem(
    sessionTripKey(content.tripId),
    JSON.stringify(content),
  );
}

// --- Public API ---

export async function getTrips(): Promise<Trip[]> {
  const cached = getSessionTrips();
  if (cached) {
    return cached;
  }
  const trips = await fetchTripsFromFile();
  setSessionTrips(trips);
  return trips;
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  setSessionTrips(trips);
  await writeTripsToFile(trips);
}

export async function addTrip(trip: Trip): Promise<void> {
  const trips = await getTrips();
  await saveTrips([...trips, trip]);
}

export async function deleteTrip(id: string): Promise<void> {
  const trips = (await getTrips()).filter(t => t.id !== id);
  await Promise.all([saveTrips(trips), deleteTripContentFile(id)]);
  sessionStorage.removeItem(sessionTripKey(id));
}

export async function getTripContent(
  tripId: string,
): Promise<TripContent | null> {
  const cached = getSessionTripContent(tripId);
  if (cached) {
    return cached;
  }
  const content = await fetchTripContentFromFile(tripId);
  if (content) {
    setSessionTripContent(content);
  }
  return content;
}

export async function saveTripContent(content: TripContent): Promise<void> {
  setSessionTripContent(content);
  await writeTripContentToFile(content);
}

/**
 * Creates an empty TripContent for the given trip based on its date range.
 * Does not persist — call saveTripContent to write it.
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

  return { tripId: trip.id, days };
}

export async function getOrInitTripContent(trip: Trip): Promise<TripContent> {
  const content = await getTripContent(trip.id);
  if (content) {
    return content;
  }
  const newContent = initTripContent(trip);
  await saveTripContent(newContent);
  return newContent;
}

export async function forceReloadTrips(): Promise<Trip[]> {
  sessionStorage.removeItem(SESSION_TRIPS_KEY);
  return getTrips();
}

export async function forceReloadTripContent(trip: Trip): Promise<TripContent> {
  sessionStorage.removeItem(sessionTripKey(trip.id));
  return getOrInitTripContent(trip);
}
