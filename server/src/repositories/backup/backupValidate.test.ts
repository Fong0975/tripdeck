import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';

import type { BackupManifest, TripBackupData } from '../../types/backup';

import { parseBackupZip } from './backupValidate';
import { BackupValidationError } from './errors';

/** Runs `fn`, expecting it to throw a `BackupValidationError`, and returns that error. */
function captureValidationError(fn: () => unknown): BackupValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(BackupValidationError);
    return err as BackupValidationError;
  }
  throw new Error('Expected parseBackupZip to throw a BackupValidationError');
}

function sampleTripData(
  overrides: Partial<TripBackupData['trip']> = {},
): TripBackupData {
  return {
    trip: {
      id: 1,
      title: 'Trip',
      destination: null,
      startDate: '2024-05-10',
      endDate: '2024-05-12',
      description: null,
      images: [{ id: 1, filename: 'trip1.jpg', title: 'cover' }],
      ...overrides,
    },
    content: {
      tripId: 1,
      days: [
        {
          id: 10,
          day: 1,
          date: '2024-05-10',
          notes: null,
          locations: [],
          attractions: [
            {
              id: 100,
              name: 'Attraction',
              googleMapUrl: null,
              notes: null,
              nearbyAttractions: null,
              startTime: null,
              endTime: null,
              referenceWebsites: [],
              images: [{ id: 2, filename: 'attr1.jpg', title: 'a' }],
              sortOrder: 0,
            },
          ],
          connections: [],
          images: [],
        },
      ],
    },
    checklist: null,
  };
}

function collectAllFilenames(data: TripBackupData): string[] {
  const filenames = data.trip.images.map(i => i.filename);
  for (const day of data.content.days) {
    filenames.push(...day.images.map(i => i.filename));
    for (const attraction of day.attractions) {
      filenames.push(...attraction.images.map(i => i.filename));
    }
    for (const connection of day.connections) {
      filenames.push(...connection.images.map(i => i.filename));
    }
  }
  return filenames;
}

interface TripFixture {
  folder: string;
  data: TripBackupData;
  /** Filenames to actually write under images/. Defaults to every referenced image. */
  imagesToInclude?: string[];
  skipDataJson?: boolean;
  malformedDataJson?: boolean;
}

interface BuildZipOptions {
  /** A manifest payload to serialize as-is, or a sentinel to corrupt/omit it. */
  manifest?: unknown;
  trips?: TripFixture[];
}

/** Builds a real backup zip buffer (via adm-zip) for exercising parseBackupZip. */
function buildZip({ manifest, trips }: BuildZipOptions = {}): Buffer {
  const zip = new AdmZip();
  const tripFixtures = trips ?? [{ folder: 'trip_1', data: sampleTripData() }];

  const defaultManifest: BackupManifest = {
    formatVersion: 1,
    exportedAt: '2024-01-01T00:00:00.000Z',
    tripCount: tripFixtures.length,
    trips: tripFixtures.map(t => ({
      originalTripId: t.data.trip.id,
      folder: t.folder,
      title: t.data.trip.title,
    })),
  };

  if (manifest === 'missing') {
    // Intentionally omit manifest.json entirely.
  } else if (manifest === 'malformed') {
    zip.addFile('manifest.json', Buffer.from('{not valid json', 'utf-8'));
  } else {
    zip.addFile(
      'manifest.json',
      Buffer.from(JSON.stringify(manifest ?? defaultManifest), 'utf-8'),
    );
  }

  for (const trip of tripFixtures) {
    if (trip.skipDataJson) {
      // Intentionally omit data.json for this trip.
    } else if (trip.malformedDataJson) {
      zip.addFile(
        `trips/${trip.folder}/data.json`,
        Buffer.from('{not valid json', 'utf-8'),
      );
    } else {
      zip.addFile(
        `trips/${trip.folder}/data.json`,
        Buffer.from(JSON.stringify(trip.data), 'utf-8'),
      );
    }

    const filenames = trip.imagesToInclude ?? collectAllFilenames(trip.data);
    for (const filename of filenames) {
      zip.addFile(
        `trips/${trip.folder}/images/${filename}`,
        Buffer.from(`bytes-${filename}`, 'utf-8'),
      );
    }
  }

  return zip.toBuffer();
}

describe('parseBackupZip', () => {
  it('parses a valid backup and reads every referenced image into imageBuffers', () => {
    const result = parseBackupZip(buildZip());

    expect(result.manifest.tripCount).toBe(1);
    expect(result.trips).toHaveLength(1);

    const [trip] = result.trips;
    expect(trip.folder).toBe('trip_1');
    expect(trip.originalTripId).toBe(1);
    expect(trip.data).toEqual(sampleTripData());
    expect(trip.imageBuffers.get('trip1.jpg')?.toString()).toBe(
      'bytes-trip1.jpg',
    );
    expect(trip.imageBuffers.get('attr1.jpg')?.toString()).toBe(
      'bytes-attr1.jpg',
    );
  });

  it('keeps emoji/CJK trip titles intact when parsing', () => {
    const data = sampleTripData({ title: '東京 🗼 五日遊' });
    const result = parseBackupZip(
      buildZip({ trips: [{ folder: 'trip_1', data }] }),
    );

    expect(result.trips[0].data.trip.title).toBe('東京 🗼 五日遊');
  });

  it('throws when the buffer is not a valid zip archive', () => {
    expect(() => parseBackupZip(Buffer.from('not a zip file'))).toThrow(
      BackupValidationError,
    );
    expect(() => parseBackupZip(Buffer.from('not a zip file'))).toThrow(
      /not a valid zip archive/,
    );
  });

  it('throws when manifest.json is missing', () => {
    expect(() => parseBackupZip(buildZip({ manifest: 'missing' }))).toThrow(
      /manifest\.json missing or unreadable/,
    );
  });

  it('throws when manifest.json is malformed JSON', () => {
    expect(() => parseBackupZip(buildZip({ manifest: 'malformed' }))).toThrow(
      /manifest\.json missing or unreadable/,
    );
  });

  it('throws when the format version is unsupported', () => {
    const manifest = {
      formatVersion: 2,
      exportedAt: '2024-01-01T00:00:00.000Z',
      tripCount: 1,
      trips: [{ originalTripId: 1, folder: 'trip_1', title: 'Trip' }],
    };

    expect(() => parseBackupZip(buildZip({ manifest }))).toThrow(
      /Unsupported backup format version: 2/,
    );
  });

  it('throws when manifest.trips is not an array', () => {
    const manifest = {
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      tripCount: 1,
      trips: 'not-an-array',
    };

    expect(() => parseBackupZip(buildZip({ manifest }))).toThrow(
      /manifest\.trips is missing or malformed/,
    );
  });

  it("throws when a trip's data.json is missing", () => {
    const zip = buildZip({
      trips: [{ folder: 'trip_1', data: sampleTripData(), skipDataJson: true }],
    });

    expect(() => parseBackupZip(zip)).toThrow(
      /trips\/trip_1\/data\.json missing or unreadable/,
    );
  });

  it("throws when a trip's data.json is malformed JSON", () => {
    const zip = buildZip({
      trips: [
        { folder: 'trip_1', data: sampleTripData(), malformedDataJson: true },
      ],
    });

    expect(() => parseBackupZip(zip)).toThrow(
      /trips\/trip_1\/data\.json missing or unreadable/,
    );
  });

  it('rejects the whole backup and reports which images are missing for one trip', () => {
    const zip = buildZip({
      trips: [
        {
          folder: 'trip_1',
          data: sampleTripData(),
          imagesToInclude: ['trip1.jpg'], // attr1.jpg intentionally omitted
        },
      ],
    });

    const err = captureValidationError(() => parseBackupZip(zip));

    expect(err.message).toBe(
      'Backup file is incomplete: 1 image file(s) missing',
    );
    expect(err.details).toEqual({
      trips: [
        { folder: 'trip_1', title: 'Trip', missingFilenames: ['attr1.jpg'] },
      ],
    });
  });

  it('collects missing images across every trip before throwing, not just the first', () => {
    const tripA = sampleTripData({ id: 1, title: 'Trip A' });
    const tripB = sampleTripData({ id: 2, title: 'Trip B' });
    const zip = buildZip({
      trips: [
        { folder: 'trip_1', data: tripA, imagesToInclude: [] },
        { folder: 'trip_2', data: tripB, imagesToInclude: ['trip1.jpg'] },
      ],
    });

    const err = captureValidationError(() => parseBackupZip(zip));

    expect(err.message).toBe(
      'Backup file is incomplete: 3 image file(s) missing',
    );
    expect(err.details).toEqual({
      trips: [
        {
          folder: 'trip_1',
          title: 'Trip A',
          missingFilenames: ['trip1.jpg', 'attr1.jpg'],
        },
        {
          folder: 'trip_2',
          title: 'Trip B',
          missingFilenames: ['attr1.jpg'],
        },
      ],
    });
  });
});
