import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';

import type { BackupManifest, TripBackupData } from '../../types/backup';
import type { ChecklistTemplateResponse } from '../../types/checklist';

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

/** A minimal single-trip manifest matching `data`, for tests that build a zip by hand. */
function defaultManifestFor(data: TripBackupData): BackupManifest {
  return {
    formatVersion: 1,
    exportedAt: '2024-01-01T00:00:00.000Z',
    tripCount: 1,
    trips: [
      {
        originalTripId: data.trip.id,
        folder: 'trip_1',
        title: data.trip.title,
      },
    ],
  };
}

function sampleTemplate(): ChecklistTemplateResponse {
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
  };
}

interface BuildZipOptions {
  /** A manifest payload to serialize as-is, or a sentinel to corrupt/omit it. */
  manifest?: unknown;
  trips?: TripFixture[];
  /** When set, the manifest declares `includesTemplate: true`. */
  includesTemplate?: boolean;
  template?: ChecklistTemplateResponse;
  skipTemplateJson?: boolean;
  malformedTemplateJson?: boolean;
}

/** Builds a real backup zip buffer (via adm-zip) for exercising parseBackupZip. */
function buildZip({
  manifest,
  trips,
  includesTemplate,
  template,
  skipTemplateJson,
  malformedTemplateJson,
}: BuildZipOptions = {}): Buffer {
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
    ...(includesTemplate ? { includesTemplate: true } : {}),
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

  if (includesTemplate) {
    if (skipTemplateJson) {
      // Intentionally omit template.json entirely.
    } else if (malformedTemplateJson) {
      zip.addFile('template.json', Buffer.from('{not valid json', 'utf-8'));
    } else {
      zip.addFile(
        'template.json',
        Buffer.from(JSON.stringify(template ?? sampleTemplate()), 'utf-8'),
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

  it('leaves template null when manifest.includesTemplate is not set', () => {
    const result = parseBackupZip(buildZip());

    expect(result.template).toBeNull();
  });

  it('parses template.json when manifest.includesTemplate is true', () => {
    const template = sampleTemplate();
    const result = parseBackupZip(
      buildZip({ includesTemplate: true, template }),
    );

    expect(result.template).toEqual(template);
  });

  it('throws when includesTemplate is true but template.json is missing', () => {
    const zip = buildZip({ includesTemplate: true, skipTemplateJson: true });

    expect(() => parseBackupZip(zip)).toThrow(
      /template\.json missing or unreadable/,
    );
  });

  it('throws when includesTemplate is true but template.json is malformed JSON', () => {
    const zip = buildZip({
      includesTemplate: true,
      malformedTemplateJson: true,
    });

    expect(() => parseBackupZip(zip)).toThrow(
      /template\.json missing or unreadable/,
    );
  });

  describe('zip bomb guard', () => {
    /** 21 MB of zeros — one byte over MAX_ENTRY_UNCOMPRESSED_BYTES (20 MB) and highly compressible, exactly the shape of a "zip bomb" entry. */
    const oversizedContent = Buffer.alloc(21 * 1024 * 1024, 0);

    it('rejects a data.json entry whose declared uncompressed size exceeds the cap', () => {
      const zip = new AdmZip();
      zip.addFile(
        'manifest.json',
        Buffer.from(
          JSON.stringify(defaultManifestFor(sampleTripData())),
          'utf-8',
        ),
      );
      zip.addFile('trips/trip_1/data.json', oversizedContent);

      expect(() => parseBackupZip(zip.toBuffer())).toThrow(
        /"trips\/trip_1\/data\.json" is too large \(\d+ bytes uncompressed\)/,
      );
    });

    it('rejects an image entry whose declared uncompressed size exceeds the cap', () => {
      const zip = new AdmZip();
      const data = sampleTripData();
      zip.addFile(
        'manifest.json',
        Buffer.from(JSON.stringify(defaultManifestFor(data)), 'utf-8'),
      );
      zip.addFile(
        'trips/trip_1/data.json',
        Buffer.from(JSON.stringify(data), 'utf-8'),
      );
      zip.addFile('trips/trip_1/images/trip1.jpg', oversizedContent);
      zip.addFile(
        'trips/trip_1/images/attr1.jpg',
        Buffer.from('bytes-attr1.jpg', 'utf-8'),
      );

      expect(() => parseBackupZip(zip.toBuffer())).toThrow(
        /"trips\/trip_1\/images\/trip1\.jpg" is too large \(\d+ bytes uncompressed\)/,
      );
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
