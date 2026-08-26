export interface ReferenceWebsite {
  url: string;
  title: string;
}

export type TransportMode =
  | 'walk'
  | 'drive'
  | 'transit'
  | 'bike'
  | 'taxi'
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
  images?: AttractionImage[];
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

export interface DayLocation {
  id: number;
  name: string;
}

export interface DayPlan {
  id: number;
  day: number;
  date: string;
  notes?: string | null;
  locations: DayLocation[];
  attractions: Attraction[];
  connections: TravelConnection[];
  images?: AttractionImage[];
}

export interface TripContent {
  tripId: number;
  days: DayPlan[];
}

export interface ItemSpec {
  id: number;
  name: string;
  storage_location: string | null;
}

export interface ChecklistItem {
  id: number;
  name: string;
  quantity?: number | null;
  notes?: string | null;
  storage_location?: string | null;
  specs?: ItemSpec[];
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

/** One trip from a backup file that was successfully imported as a new trip. */
export interface ImportedTripSummary {
  originalTripId: number;
  newTripId: number;
  /** The (possibly de-duplicated) title the new trip was created with. */
  title: string;
}

/** One trip from a backup file that failed to import. */
export interface FailedTripSummary {
  originalTripId: number;
  title: string;
  error: string;
}

export interface ImportBackupResult {
  imported: ImportedTripSummary[];
  failed: FailedTripSummary[];
  /** True only when template restoration was requested and actually happened. */
  templateRestored: boolean;
}

/** Per-trip missing-image detail attached to a backup validation error. */
export interface ImportBackupErrorDetails {
  trips: {
    folder: string;
    title: string;
    missingFilenames: string[];
  }[];
}

/** One automatic backup file, as listed/downloaded via `/api/backups`. */
export interface AutoBackupFileInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}
