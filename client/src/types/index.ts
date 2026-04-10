export interface ReferenceWebsite {
  url: string;
  title: string;
}

export type TransportMode =
  | 'walk'
  | 'drive'
  | 'transit'
  | 'bike'
  | 'flight'
  | 'other';

export interface AttractionImage {
  id: number;
  filename: string;
  title: string;
}

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
  startTime?: string | null;
  endTime?: string | null;
  referenceWebsites?: ReferenceWebsite[];
  images?: AttractionImage[];
}

export interface TravelConnection {
  id: number;
  fromAttractionId: number;
  toAttractionId: number;
  transportMode: TransportMode;
  duration?: string | null;
  route?: string | null;
  notes?: string | null;
  images?: AttractionImage[];
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
  quantity?: number | null;
  notes?: string | null;
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
