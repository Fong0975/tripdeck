import type { ChecklistTemplate } from '@tripdeck/shared';

import { createLogger } from '../../logger';
import type {
  BackupManifestTripEntry,
  TripBackupData,
} from '../../types/backup';

import { BackupValidationError } from './errors';

const logger = createLogger('backup');

/**
 * Checks `value` (found at `path` inside a JSON document) and returns the
 * path of the first invalid or missing field, or null when it matches. The
 * document root has the empty path `''`.
 */
type Validator = (value: unknown, path: string) => string | null;

/**
 * Returns whether `value` is a plain JSON object (not null, not an array).
 *
 * @param value - Any parsed JSON value.
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function primitive(predicate: (value: unknown) => boolean): Validator {
  return (value, path) => (predicate(value) ? null : path);
}

function nullable(validator: Validator): Validator {
  return (value, path) => (value === null ? null : validator(value, path));
}

/** Accepts a missing field, e.g. one added after older backups were made. */
function optional(validator: Validator): Validator {
  return (value, path) => (value === undefined ? null : validator(value, path));
}

function arrayOf(item: Validator): Validator {
  return (value, path) => {
    if (!Array.isArray(value)) {
      return path;
    }
    for (let i = 0; i < value.length; i++) {
      const problem = item(value[i], `${path}[${i}]`);
      if (problem !== null) {
        return problem;
      }
    }
    return null;
  };
}

function childPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

/** An object whose every own value must satisfy `entry` (a JSON map). */
function recordOf(entry: Validator): Validator {
  return (value, path) => {
    if (!isJsonObject(value)) {
      return path;
    }
    for (const [key, item] of Object.entries(value)) {
      const problem = entry(item, childPath(path, key));
      if (problem !== null) {
        return problem;
      }
    }
    return null;
  };
}

/**
 * An object that must carry every listed field. Fields not listed are
 * ignored, so extra or optional data (e.g. attraction geo fields, which the
 * importer sanitizes itself) never causes a rejection.
 */
function shape(fields: Record<string, Validator>): Validator {
  return (value, path) => {
    if (!isJsonObject(value)) {
      return path;
    }
    for (const [key, validator] of Object.entries(fields)) {
      const problem = validator(value[key], childPath(path, key));
      if (problem !== null) {
        return problem;
      }
    }
    return null;
  };
}

const stringField = primitive(value => typeof value === 'string');
const nullableString = nullable(stringField);
const integerField = primitive(value => Number.isInteger(value));
const booleanField = primitive(value => typeof value === 'boolean');
const nullableNumber = nullable(
  primitive(value => typeof value === 'number' && Number.isFinite(value)),
);

const imagesField = arrayOf(
  shape({ filename: stringField, title: stringField }),
);

const attractionValidator = shape({
  id: integerField,
  name: stringField,
  googleMapUrl: nullableString,
  notes: nullableString,
  nearbyAttractions: nullableString,
  startTime: nullableString,
  endTime: nullableString,
  sortOrder: integerField,
  referenceWebsites: arrayOf(shape({ url: stringField, title: stringField })),
  images: imagesField,
});

const connectionValidator = shape({
  id: integerField,
  fromAttractionId: integerField,
  toAttractionId: integerField,
  transportMode: nullableString,
  duration: nullableString,
  route: nullableString,
  notes: nullableString,
  images: imagesField,
});

const dayValidator = shape({
  id: integerField,
  day: integerField,
  date: stringField,
  notes: nullableString,
  locations: arrayOf(shape({ name: stringField })),
  attractions: arrayOf(attractionValidator),
  connections: arrayOf(connectionValidator),
  images: imagesField,
});

/** Fields shared by trip checklist items and checklist template items. */
const checklistItemFields: Record<string, Validator> = {
  name: stringField,
  quantity: nullableNumber,
  notes: nullableString,
  storage_location: nullableString,
  specs: arrayOf(
    shape({ name: stringField, storage_location: nullableString }),
  ),
};

const tripChecklistValidator = shape({
  categories: arrayOf(
    shape({
      name: stringField,
      items: arrayOf(shape({ id: integerField, ...checklistItemFields })),
    }),
  ),
  occasions: arrayOf(
    shape({
      id: integerField,
      name: stringField,
      checks: recordOf(booleanField),
      specChecks: optional(recordOf(booleanField)),
    }),
  ),
});

const tripBackupDataValidator = shape({
  trip: shape({
    id: integerField,
    title: stringField,
    destination: nullableString,
    startDate: stringField,
    endDate: stringField,
    description: nullableString,
    images: imagesField,
  }),
  content: shape({ days: arrayOf(dayValidator) }),
  checklist: nullable(tripChecklistValidator),
});

const checklistTemplateValidator = shape({
  categories: arrayOf(
    shape({
      name: stringField,
      items: arrayOf(shape(checklistItemFields)),
    }),
  ),
});

const manifestTripsValidator = arrayOf(
  shape({
    originalTripId: integerField,
    folder: stringField,
    title: stringField,
  }),
);

/**
 * Throws a `BackupValidationError` naming the first invalid field when
 * `value` does not match `validator`.
 */
function assertShape(
  validator: Validator,
  value: unknown,
  entryPath: string,
): void {
  const problem = validator(value, '');
  if (problem === null) {
    return;
  }
  logger.warn('Rejected backup upload: JSON entry has an invalid structure', {
    entryPath,
    problem: problem === '' ? '(root)' : problem,
  });
  throw new BackupValidationError(
    problem === ''
      ? `Invalid backup file: ${entryPath} is not a JSON object`
      : `Invalid backup file: ${entryPath} has a missing or invalid "${problem}" field`,
  );
}

/**
 * Asserts that a parsed trip `data.json` has every field the importer reads,
 * with the expected types, so a malformed backup is rejected up front with a
 * clear message instead of crashing (or writing partial rows) mid-import.
 *
 * @param value - The parsed JSON content of the entry.
 * @param entryPath - The entry's path inside the zip, used in the error message.
 * @throws BackupValidationError naming the first invalid field.
 */
export function assertTripBackupData(
  value: unknown,
  entryPath: string,
): asserts value is TripBackupData {
  assertShape(tripBackupDataValidator, value, entryPath);
}

/**
 * Asserts that a parsed `template.json` has every field the template restore
 * step reads, with the expected types.
 *
 * @param value - The parsed JSON content of the entry.
 * @param entryPath - The entry's path inside the zip, used in the error message.
 * @throws BackupValidationError naming the first invalid field.
 */
export function assertChecklistTemplate(
  value: unknown,
  entryPath: string,
): asserts value is ChecklistTemplate {
  assertShape(checklistTemplateValidator, value, entryPath);
}

/**
 * Returns whether `value` is a well-formed `manifest.trips` list, i.e. an
 * array whose every entry carries an integer `originalTripId` and string
 * `folder` and `title` fields.
 *
 * @param value - The manifest's `trips` field.
 */
export function isManifestTripList(
  value: unknown,
): value is BackupManifestTripEntry[] {
  return manifestTripsValidator(value, 'trips') === null;
}
