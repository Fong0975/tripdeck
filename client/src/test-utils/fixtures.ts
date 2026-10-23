import type {
  Attraction,
  AttractionImage,
  ChecklistCategory,
  ChecklistItem,
  DayLocation,
  DayPlan,
  ItemSpec,
  TravelConnection,
  Trip,
  TripChecklist,
  TripContent,
} from '@/types';
import type { DailyWeatherData, WeatherResult } from '@/utils/weatherApi';

/**
 * Shared test fixture builders. Defaults are deliberately neutral; tests that
 * assert on a specific value should pass it as an override rather than rely
 * on the default.
 */

/** Builds a trip with only the required fields populated. */
export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Trip',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

/** Builds an empty day plan (no locations, attractions or connections). */
export function makeDay(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-01-01',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

/**
 * Wraps days into trip content. Defaults to a single empty day with id 10,
 * the shape most action-hook tests operate on.
 */
export function makeContent(
  days: DayPlan[] = [makeDay({ id: 10 })],
  tripId = 1,
): TripContent {
  return { tripId, days };
}

/**
 * Builds the two-day itinerary used by board-level tests: day 1 has
 * attractions 10 ('Attraction A') and 11 ('Attraction B') joined by
 * connection 100; day 2 has attraction 20 ('Attraction C') only.
 *
 * @param overrides - Per-day overrides, applied by index.
 */
export function makeBoardDays(overrides: Partial<DayPlan>[] = []): DayPlan[] {
  const base: DayPlan[] = [
    makeDay({
      attractions: [
        makeAttraction({ id: 10, name: 'Attraction A' }),
        makeAttraction({ id: 11, name: 'Attraction B' }),
      ],
      connections: [
        makeConnection({ id: 100, fromAttractionId: 10, toAttractionId: 11 }),
      ],
    }),
    makeDay({
      id: 2,
      day: 2,
      date: '2026-01-02',
      attractions: [makeAttraction({ id: 20, name: 'Attraction C' })],
    }),
  ];
  return base.map((day, i) => ({ ...day, ...overrides[i] }));
}

/** Builds an attraction with only the required fields populated. */
export function makeAttraction(
  overrides: Partial<Attraction> = {},
): Attraction {
  return { id: 1, name: 'Attraction', ...overrides };
}

/** Builds a walking connection from attraction 1 to attraction 2. */
export function makeConnection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return {
    id: 1,
    fromAttractionId: 1,
    toAttractionId: 2,
    transportMode: 'walk',
    ...overrides,
  };
}

/** Builds a day location. */
export function makeLocation(
  overrides: Partial<DayLocation> = {},
): DayLocation {
  return { id: 1, name: 'Tokyo', ...overrides };
}

/** Builds an uploaded image record. */
export function makeImage(
  overrides: Partial<AttractionImage> = {},
): AttractionImage {
  return { id: 1, filename: 'photo.jpg', title: '', ...overrides };
}

/** Builds a checklist item spec. */
export function makeChecklistSpec(overrides: Partial<ItemSpec> = {}): ItemSpec {
  return { id: 1, name: 'Spec', storage_location: null, ...overrides };
}

/** Builds a checklist item with only the required fields populated. */
export function makeChecklistItem(
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return { id: 1, name: 'Item', ...overrides };
}

/** Builds a checklist category with no items. */
export function makeChecklistCategory(
  overrides: Partial<ChecklistCategory> = {},
): ChecklistCategory {
  return { id: 1, name: 'Category', items: [], ...overrides };
}

/** Builds a trip checklist with no categories or occasions. */
export function makeTripChecklist(
  overrides: Partial<TripChecklist> = {},
): TripChecklist {
  return { tripId: 1, categories: [], occasions: [], ...overrides };
}

/** Builds a successful weather lookup result. */
export function makeWeatherSuccess(
  overrides: Partial<DailyWeatherData> = {},
  source: Extract<
    WeatherResult,
    { status: 'success' }
  >['source'] = 'openweathermap',
): WeatherResult {
  return {
    status: 'success',
    source,
    data: {
      resolvedName: 'Tokyo',
      icon: 'clear',
      description: 'Clear sky',
      tempMin: 20,
      tempMax: 28,
      humidity: 55,
      pop: 30,
      ...overrides,
    },
  };
}

/** Builds a minimal successful fetch `Response` whose `json()` resolves to `body`. */
export function makeJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}
