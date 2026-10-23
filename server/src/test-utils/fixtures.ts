import type { TripBackupData } from '../types/backup';
import type { ChecklistTemplateResponse } from '../types/checklist';
import type { TripResponse } from '../types/trip';

/**
 * Builds a `TripResponse` with sensible defaults (a Kyoto trip with no
 * images). Pass explicit overrides for any field a test asserts on.
 *
 * @param overrides - Fields to replace on the default trip.
 */
export function makeTrip(overrides: Partial<TripResponse> = {}): TripResponse {
  return {
    ...baseTripFields(),
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseTripFields(): TripBackupData['trip'] {
  return {
    id: 1,
    title: 'Kyoto Trip',
    destination: 'Kyoto',
    startDate: '2024-05-10',
    endDate: '2024-05-12',
    description: null,
    images: [],
  };
}

/**
 * Builds a checklist template with one "Documents" category holding a single
 * "Passport" item that has no specs.
 *
 * @param overrides - Fields to replace on the default template.
 */
export function makeTemplate(
  overrides: Partial<ChecklistTemplateResponse> = {},
): ChecklistTemplateResponse {
  return {
    categories: [
      {
        id: 1,
        name: 'Documents',
        items: [
          {
            id: 1,
            name: 'Passport',
            quantity: 1,
            notes: null,
            storage_location: null,
            specs: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** Overrides for `makeTripBackupData`; `trip` is merged field by field. */
export interface TripBackupDataOverrides {
  trip?: Partial<TripBackupData['trip']>;
  content?: TripBackupData['content'];
  checklist?: TripBackupData['checklist'];
}

/**
 * Builds a single-trip backup payload: the default `makeTrip()` trip (without
 * `createdAt`), empty content and no checklist.
 *
 * @param overrides - `trip` fields are merged into the default trip;
 *   `content`/`checklist` replace the defaults wholesale.
 */
export function makeTripBackupData(
  overrides: TripBackupDataOverrides = {},
): TripBackupData {
  const trip = { ...baseTripFields(), ...overrides.trip };
  return {
    trip,
    content: overrides.content ?? { tripId: trip.id, days: [] },
    checklist: overrides.checklist ?? null,
  };
}

/** Request bodies that must be rejected with "name is required". */
export const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is not a string', body: { name: 42 } },
];
