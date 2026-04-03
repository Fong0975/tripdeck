export type TransportMode =
  | 'walk'
  | 'drive'
  | 'transit'
  | 'bike'
  | 'flight'
  | 'other';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  createdAt: string;
}

export interface Attraction {
  id: string;
  name: string;
  googleMapUrl?: string;
  notes?: string;
  nearbyAttractions?: string;
  referenceWebsites?: string[];
}

export interface TravelConnection {
  id: string;
  fromAttractionId: string;
  toAttractionId: string;
  transportMode: TransportMode;
  duration?: string;
  route?: string;
  notes?: string;
}

export interface DayPlan {
  day: number;
  date: string;
  attractions: Attraction[];
  connections: TravelConnection[];
}

export interface TripContent {
  tripId: string;
  days: DayPlan[];
}

export interface ChecklistItem {
  id: string;
  name: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  categories: ChecklistCategory[];
}

export interface ChecklistOccasion {
  id: string;
  name: string;
  /** Maps itemId to checked state */
  checks: Record<string, boolean>;
}

export interface TripChecklist {
  tripId: string;
  categories: ChecklistCategory[];
  occasions: ChecklistOccasion[];
}
