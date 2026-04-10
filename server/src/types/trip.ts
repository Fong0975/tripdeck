// --- Response shapes returned to the client ---

export interface ImageResponse {
  id: number;
  filename: string;
  title: string;
}

export interface TripResponse {
  id: number;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt: string;
}

export interface AttractionResponse {
  id: number;
  name: string;
  googleMapUrl: string | null;
  notes: string | null;
  nearbyAttractions: string | null;
  startTime: string | null;
  endTime: string | null;
  referenceWebsites: string[];
  images: ImageResponse[];
  sortOrder: number;
}

export interface ConnectionResponse {
  id: number;
  fromAttractionId: number;
  toAttractionId: number;
  transportMode: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
  images: ImageResponse[];
}

export interface DayResponse {
  id: number;
  day: number;
  date: string;
  attractions: AttractionResponse[];
  connections: ConnectionResponse[];
}

export interface TripContentResponse {
  tripId: number;
  days: DayResponse[];
}

// --- Request body shapes ---

export interface CreateTripBody {
  title: string;
  destination?: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface CreateAttractionBody {
  name: string;
  googleMapUrl?: string;
  notes?: string;
  nearbyAttractions?: string;
  startTime?: string;
  endTime?: string;
  referenceWebsites?: string[];
}

export interface UpdateAttractionBody {
  name?: string;
  googleMapUrl?: string | null;
  notes?: string | null;
  nearbyAttractions?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  referenceWebsites?: string[];
}

export interface ReorderAttractionsBody {
  orderedIds: number[];
}

export interface CreateConnectionBody {
  fromAttractionId: number;
  toAttractionId: number;
  transportMode: string;
  duration?: string;
  route?: string;
  notes?: string;
}

export interface UpdateConnectionBody {
  fromAttractionId?: number;
  toAttractionId?: number;
  transportMode?: string;
  duration?: string | null;
  route?: string | null;
  notes?: string | null;
}
