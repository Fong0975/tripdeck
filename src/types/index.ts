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
