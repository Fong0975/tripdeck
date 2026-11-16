import { describe, expect, it, vi } from 'vitest';

import { makeTemplate, makeTripBackupData } from '../../test-utils/fixtures';
import type { TripBackupData } from '../../types/backup';

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import {
  assertChecklistTemplate,
  assertTripBackupData,
  isJsonObject,
  isManifestTripList,
} from './backupSchema';
import { BackupValidationError } from './errors';

const DATA_PATH = 'trips/trip_1/data.json';
const TEMPLATE_PATH = 'template.json';

/** Marker for `withValueAt` meaning "delete the field" instead of setting it. */
const REMOVE = Symbol('remove');

/** A trip backup that exercises every nested collection the schema checks. */
function validTripData(): TripBackupData {
  return makeTripBackupData({
    trip: { images: [{ id: 1, filename: 'trip1.jpg', title: 'cover' }] },
    content: {
      tripId: 1,
      days: [
        {
          id: 10,
          day: 1,
          date: '2024-05-10',
          notes: null,
          locations: [{ id: 50, name: 'Kyoto Station' }],
          attractions: [
            {
              id: 100,
              name: 'Fushimi Inari',
              googleMapUrl: null,
              notes: null,
              nearbyAttractions: null,
              startTime: '09:00',
              endTime: null,
              referenceWebsites: [{ url: 'https://inari.jp', title: 'Site' }],
              images: [{ id: 2, filename: 'attr1.jpg', title: 'a' }],
              sortOrder: 0,
              latitude: null,
              longitude: null,
              geoSource: null,
            },
          ],
          connections: [
            {
              id: 200,
              fromAttractionId: 100,
              toAttractionId: 100,
              transportMode: 'walk',
              duration: null,
              route: null,
              notes: null,
              images: [{ id: 3, filename: 'conn1.jpg', title: 'c' }],
            },
          ],
          images: [],
        },
      ],
    },
    checklist: {
      tripId: 1,
      categories: [
        {
          id: 300,
          name: 'Clothes',
          items: [
            {
              id: 400,
              name: 'Jacket',
              quantity: 1,
              notes: null,
              storage_location: null,
              specs: [{ id: 500, name: 'Size M', storage_location: null }],
            },
          ],
        },
      ],
      occasions: [
        {
          id: 600,
          name: 'Packing',
          checks: { 400: true },
          specChecks: { 500: true },
        },
      ],
    },
  });
}

/**
 * Returns a deep copy of `base` with the value at `path` (dotted, with
 * `[n]` array indexes) replaced by `value`, or removed when it is `REMOVE`.
 */
function withValueAt(base: unknown, path: string, value: unknown): unknown {
  const copy = structuredClone(base) as Record<string, unknown>;
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let target = copy;
  for (const key of keys.slice(0, -1)) {
    target = target[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1];
  if (value === REMOVE) {
    delete target[lastKey];
  } else {
    target[lastKey] = value;
  }
  return copy;
}

function invalidFieldMessage(entryPath: string, field: string): string {
  return `Invalid backup file: ${entryPath} has a missing or invalid "${field}" field`;
}

/** Runs `fn` and returns the thrown validation message, or null when it does not throw. */
function validationMessage(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    expect(err).toBeInstanceOf(BackupValidationError);
    return (err as Error).message;
  }
}

describe('assertTripBackupData', () => {
  const valid = validTripData();

  const invalidFieldCases: Array<{ path: string; value: unknown }> = [
    { path: 'trip', value: REMOVE },
    { path: 'trip.id', value: '1' },
    { path: 'trip.title', value: 42 },
    { path: 'trip.destination', value: REMOVE },
    { path: 'trip.startDate', value: null },
    { path: 'trip.description', value: 5 },
    { path: 'trip.images', value: 'none' },
    { path: 'trip.images[0].filename', value: REMOVE },
    { path: 'content', value: null },
    { path: 'content.days', value: REMOVE },
    { path: 'content.days[0].id', value: 1.5 },
    { path: 'content.days[0].date', value: REMOVE },
    { path: 'content.days[0].locations[0].name', value: null },
    { path: 'content.days[0].attractions[0].name', value: 7 },
    { path: 'content.days[0].attractions[0].sortOrder', value: '0' },
    { path: 'content.days[0].attractions[0].googleMapUrl', value: REMOVE },
    {
      path: 'content.days[0].attractions[0].referenceWebsites[0].url',
      value: REMOVE,
    },
    { path: 'content.days[0].attractions[0].images[0].title', value: 1 },
    { path: 'content.days[0].connections[0].fromAttractionId', value: REMOVE },
    { path: 'content.days[0].connections[0].transportMode', value: 3 },
    { path: 'content.days[0].connections[0].images', value: {} },
    { path: 'content.days[0].images', value: REMOVE },
    { path: 'checklist', value: 'none' },
    { path: 'checklist.categories', value: REMOVE },
    { path: 'checklist.categories[0].name', value: null },
    { path: 'checklist.categories[0].items[0].id', value: REMOVE },
    { path: 'checklist.categories[0].items[0].quantity', value: '1' },
    { path: 'checklist.categories[0].items[0].specs[0].name', value: REMOVE },
    { path: 'checklist.occasions[0].checks', value: [] },
    { path: 'checklist.occasions[0].checks.400', value: 'yes' },
    { path: 'checklist.occasions[0].specChecks', value: [] },
    { path: 'checklist.occasions[0].specChecks.500', value: 'yes' },
  ];

  const tests: Array<{
    name: string;
    data: unknown;
    expectedError: string | null;
  }> = [
    { name: 'a fully populated backup', data: valid, expectedError: null },
    {
      name: 'a backup without a checklist',
      data: withValueAt(valid, 'checklist', null),
      expectedError: null,
    },
    {
      name: 'a backup with no days',
      data: withValueAt(valid, 'content.days', []),
      expectedError: null,
    },
    {
      name: 'an attraction from a backup that predates geo fields',
      data: ['latitude', 'longitude', 'geoSource'].reduce<unknown>(
        (data, field) =>
          withValueAt(data, `content.days[0].attractions[0].${field}`, REMOVE),
        valid,
      ),
      expectedError: null,
    },
    {
      name: 'an occasion from a backup that predates spec checks',
      data: withValueAt(valid, 'checklist.occasions[0].specChecks', REMOVE),
      expectedError: null,
    },
    {
      name: 'a null checklist item quantity',
      data: withValueAt(
        valid,
        'checklist.categories[0].items[0].quantity',
        null,
      ),
      expectedError: null,
    },
    {
      name: 'a root that is not an object',
      data: null,
      expectedError: `Invalid backup file: ${DATA_PATH} is not a JSON object`,
    },
    {
      name: 'a root that is an array',
      data: [],
      expectedError: `Invalid backup file: ${DATA_PATH} is not a JSON object`,
    },
    ...invalidFieldCases.map(({ path, value }) => ({
      name: `${value === REMOVE ? 'missing' : 'invalid'} ${path}`,
      data: withValueAt(valid, path, value),
      expectedError: invalidFieldMessage(DATA_PATH, path),
    })),
  ];

  it.each(tests)('$name', ({ data, expectedError }) => {
    expect(validationMessage(() => assertTripBackupData(data, DATA_PATH))).toBe(
      expectedError,
    );
  });
});

describe('assertChecklistTemplate', () => {
  const valid = makeTemplate();

  const tests: Array<{
    name: string;
    data: unknown;
    expectedError: string | null;
  }> = [
    { name: 'a valid template', data: valid, expectedError: null },
    {
      name: 'a template with no categories',
      data: { categories: [] },
      expectedError: null,
    },
    {
      name: 'a root that is not an object',
      data: 'template',
      expectedError: `Invalid backup file: ${TEMPLATE_PATH} is not a JSON object`,
    },
    {
      name: 'missing categories',
      data: {},
      expectedError: invalidFieldMessage(TEMPLATE_PATH, 'categories'),
    },
    {
      name: 'a category name that is not a string',
      data: withValueAt(valid, 'categories[0].name', 1),
      expectedError: invalidFieldMessage(TEMPLATE_PATH, 'categories[0].name'),
    },
    {
      name: 'missing item specs',
      data: withValueAt(valid, 'categories[0].items[0].specs', REMOVE),
      expectedError: invalidFieldMessage(
        TEMPLATE_PATH,
        'categories[0].items[0].specs',
      ),
    },
    {
      name: 'an item quantity that is not a number',
      data: withValueAt(valid, 'categories[0].items[0].quantity', 'two'),
      expectedError: invalidFieldMessage(
        TEMPLATE_PATH,
        'categories[0].items[0].quantity',
      ),
    },
  ];

  it.each(tests)('$name', ({ data, expectedError }) => {
    expect(
      validationMessage(() => assertChecklistTemplate(data, TEMPLATE_PATH)),
    ).toBe(expectedError);
  });
});

describe('isManifestTripList', () => {
  it.each([
    { name: 'an empty list', value: [], expected: true },
    {
      name: 'well-formed entries',
      value: [{ originalTripId: 1, folder: 'trip_1', title: 'Trip' }],
      expected: true,
    },
    { name: 'a non-array', value: 'trips', expected: false },
    {
      name: 'an entry without a folder',
      value: [{ originalTripId: 1, title: 'Trip' }],
      expected: false,
    },
    {
      name: 'a non-integer originalTripId',
      value: [{ originalTripId: '1', folder: 'trip_1', title: 'Trip' }],
      expected: false,
    },
    { name: 'a null entry', value: [null], expected: false },
  ])('returns $expected for $name', ({ value, expected }) => {
    expect(isManifestTripList(value)).toBe(expected);
  });
});

describe('isJsonObject', () => {
  it.each([
    { name: 'a plain object', value: { a: 1 }, expected: true },
    { name: 'null', value: null, expected: false },
    { name: 'an array', value: [], expected: false },
    { name: 'a string', value: 'x', expected: false },
  ])('returns $expected for $name', ({ value, expected }) => {
    expect(isJsonObject(value)).toBe(expected);
  });
});
