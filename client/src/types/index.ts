export type TransportMode =
  | 'walk'
  | 'drive'
  | 'transit'
  | 'bike'
  | 'flight'
  | 'other';

export interface Trip {
  id: number;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  description?: string | null;
  createdAt: string;
}

export interface Attraction {
  id: number;
  name: string;
  googleMapUrl?: string | null;
  notes?: string | null;
  nearbyAttractions?: string | null;
  referenceWebsites?: string[];
}

export interface TravelConnection {
  id: number;
  fromAttractionId: number;
  toAttractionId: number;
  transportMode: TransportMode;
  duration?: string | null;
  route?: string | null;
  notes?: string | null;
}

export interface DayPlan {
  id: number;
  day: number;
  date: string;
  attractions: Attraction[];
  connections: TravelConnection[];
}

export interface TripContent {
  tripId: number;
  days: DayPlan[];
}

export interface ChecklistItem {
  id: number;
  name: string;
}

export interface ChecklistCategory {
  id: number;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  categories: ChecklistCategory[];
}

export interface ChecklistOccasion {
  id: number;
  name: string;
  /** Maps item ID to checked state */
  checks: Record<number, boolean>;
}

export interface TripChecklist {
  tripId: number;
  categories: ChecklistCategory[];
  occasions: ChecklistOccasion[];
}
