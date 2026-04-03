import { differenceInCalendarDays, parseISO, format } from 'date-fns';

import type {
  Trip,
  TripContent,
  DayPlan,
  ChecklistTemplate,
  ChecklistOccasion,
  TripChecklist,
} from '@/types';

const SESSION_TRIPS_KEY = 'tripdeck_session_trips';
const sessionTripKey = (id: string) => `tripdeck_session_trip_${id}`;
const SESSION_CHECKLIST_TEMPLATE_KEY = 'tripdeck_session_checklist_template';
const sessionChecklistKey = (id: string) => `tripdeck_session_checklist_${id}`;

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

async function fetchChecklistTemplateFromFile(): Promise<ChecklistTemplate> {
  const res = await fetch('/api/records/checklist-template');
  if (!res.ok) {
    return { categories: [] };
  }
  return res.json() as Promise<ChecklistTemplate>;
}

async function writeChecklistTemplateToFile(
  template: ChecklistTemplate,
): Promise<void> {
  await fetch('/api/records/checklist-template', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
}

async function fetchTripChecklistFromFile(
  tripId: string,
): Promise<TripChecklist | null> {
  const res = await fetch(`/api/records/checklist/${tripId}`);
  if (!res.ok) {
    return null;
  }
  return res.json() as Promise<TripChecklist>;
}

async function writeTripChecklistToFile(
  checklist: TripChecklist,
): Promise<void> {
  await fetch(`/api/records/checklist/${checklist.tripId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checklist),
  });
}

async function deleteTripChecklistFile(tripId: string): Promise<void> {
  await fetch(`/api/records/checklist/${tripId}`, { method: 'DELETE' });
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

function getSessionChecklistTemplate(): ChecklistTemplate | null {
  const raw = sessionStorage.getItem(SESSION_CHECKLIST_TEMPLATE_KEY);
  return raw ? (JSON.parse(raw) as ChecklistTemplate) : null;
}

function setSessionChecklistTemplate(template: ChecklistTemplate): void {
  sessionStorage.setItem(
    SESSION_CHECKLIST_TEMPLATE_KEY,
    JSON.stringify(template),
  );
}

function getSessionTripChecklist(tripId: string): TripChecklist | null {
  const raw = sessionStorage.getItem(sessionChecklistKey(tripId));
  return raw ? (JSON.parse(raw) as TripChecklist) : null;
}

function setSessionTripChecklist(checklist: TripChecklist): void {
  sessionStorage.setItem(
    sessionChecklistKey(checklist.tripId),
    JSON.stringify(checklist),
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
  await Promise.all([
    saveTrips(trips),
    deleteTripContentFile(id),
    deleteTripChecklistFile(id),
  ]);
  sessionStorage.removeItem(sessionTripKey(id));
  sessionStorage.removeItem(sessionChecklistKey(id));
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

export async function getChecklistTemplate(): Promise<ChecklistTemplate> {
  const cached = getSessionChecklistTemplate();
  if (cached && cached.categories.length > 0) {
    return cached;
  }
  const template = await fetchChecklistTemplateFromFile();
  setSessionChecklistTemplate(template);
  return template;
}

export async function saveChecklistTemplate(
  template: ChecklistTemplate,
): Promise<void> {
  setSessionChecklistTemplate(template);
  await writeChecklistTemplateToFile(template);
}

export async function getTripChecklist(
  tripId: string,
): Promise<TripChecklist | null> {
  const cached = getSessionTripChecklist(tripId);
  if (cached) {
    return cached;
  }
  const checklist = await fetchTripChecklistFromFile(tripId);
  if (checklist) {
    setSessionTripChecklist(checklist);
  }
  return checklist;
}

export async function saveTripChecklist(
  checklist: TripChecklist,
): Promise<void> {
  setSessionTripChecklist(checklist);
  await writeTripChecklistToFile(checklist);
}

/**
 * Creates a new TripChecklist for a trip by copying the current template.
 * Initialises one default "收拾" occasion with all items unchecked.
 */
export function initTripChecklist(
  tripId: string,
  template: ChecklistTemplate,
): TripChecklist {
  const defaultOccasion: ChecklistOccasion = {
    id: 'occ-default',
    name: '收拾',
    checks: {},
  };
  return {
    tripId,
    categories: template.categories,
    occasions: [defaultOccasion],
  };
}
