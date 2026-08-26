import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripBackupData } from '../../types/backup';

const mockPoolExecute = vi.fn();
const mockConnBeginTransaction = vi.fn();
const mockConnExecute = vi.fn();
const mockConnCommit = vi.fn();
const mockConnRollback = vi.fn();
const mockConnRelease = vi.fn();
const mockGetConnection = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

const mockSaveImportedImageBuffer = vi.fn();
const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../middleware/upload', () => ({
  saveImportedImageBuffer: (...args: unknown[]) =>
    mockSaveImportedImageBuffer(...args),
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

const mockAddTripImage = vi.fn();
const mockAddDayImage = vi.fn();
const mockAddAttractionImage = vi.fn();
const mockAddConnectionImage = vi.fn();
vi.mock('../imageRepository', () => ({
  addTripImage: (...args: unknown[]) => mockAddTripImage(...args),
  addDayImage: (...args: unknown[]) => mockAddDayImage(...args),
  addAttractionImage: (...args: unknown[]) => mockAddAttractionImage(...args),
  addConnectionImage: (...args: unknown[]) => mockAddConnectionImage(...args),
}));

const mockParseBackupZip = vi.fn();
vi.mock('./backupValidate', () => ({
  parseBackupZip: (...args: unknown[]) => mockParseBackupZip(...args),
}));

import {
  generateUniqueTripTitle,
  importBackupZip,
  importSingleTrip,
} from './backupImport';
import type { ParsedBackup } from './backupValidate';

function makeConn() {
  return {
    beginTransaction: mockConnBeginTransaction,
    execute: mockConnExecute,
    commit: mockConnCommit,
    rollback: mockConnRollback,
    release: mockConnRelease,
  };
}

/** No title conflicts by default; individual tests override for dedup cases. */
function mockNoTitleConflicts() {
  mockPoolExecute.mockImplementation((sql: string) => {
    if (sql.includes('SELECT title FROM trips')) {
      return Promise.resolve([[]]);
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  });
}

/**
 * Assigns a fresh insertId per table, in insertion order, so the test can
 * assert that later inserts (e.g. connections, checks) use the *new* ids.
 */
function mockSequentialInserts() {
  let attractionCounter = 2000;
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('INSERT INTO trips')) {
      return Promise.resolve([{ insertId: 1000 }]);
    }
    if (sql.startsWith('INSERT INTO trip_days')) {
      return Promise.resolve([{ insertId: 1001 }]);
    }
    if (sql.startsWith('INSERT INTO trip_attractions')) {
      return Promise.resolve([{ insertId: attractionCounter++ }]);
    }
    if (sql.startsWith('INSERT INTO trip_connections')) {
      return Promise.resolve([{ insertId: 3000 }]);
    }
    if (sql.startsWith('INSERT INTO checklist_trip_categories')) {
      return Promise.resolve([{ insertId: 4000 }]);
    }
    if (sql.startsWith('INSERT INTO checklist_trip_items')) {
      return Promise.resolve([{ insertId: 5000 }]);
    }
    if (sql.startsWith('INSERT INTO checklist_occasions')) {
      return Promise.resolve([{ insertId: 6000 }]);
    }
    // trip_day_locations, trip_attraction_websites, checklist_trip_item_specs,
    // checklist_checks: fire-and-forget inserts, no insertId consumed.
    return Promise.resolve([{ affectedRows: 1 }]);
  });
}

/**
 * Assigns fresh insertIds to the template category/item inserts, so tests
 * can assert later inserts (items, specs) use the *new* ids. Everything
 * else (DELETE, specs) is a fire-and-forget affected-rows result.
 */
function mockTemplateInserts() {
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('INSERT INTO checklist_template_categories')) {
      return Promise.resolve([{ insertId: 7000 }]);
    }
    if (sql.startsWith('INSERT INTO checklist_template_items')) {
      return Promise.resolve([{ insertId: 8000 }]);
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  });
}

const sampleData: TripBackupData = {
  trip: {
    id: 1,
    title: 'Kyoto Trip',
    destination: 'Kyoto',
    startDate: '2024-05-10',
    endDate: '2024-05-11',
    description: null,
    images: [{ id: 1, filename: 'trip1.jpg', title: 'cover' }],
  },
  content: {
    tripId: 1,
    days: [
      {
        id: 10,
        day: 1,
        date: '2024-05-10',
        notes: 'day notes',
        locations: [{ id: 50, name: 'Kyoto Station' }],
        attractions: [
          {
            id: 100,
            name: 'Fushimi Inari',
            googleMapUrl: null,
            notes: null,
            nearbyAttractions: null,
            startTime: '09:00',
            endTime: '11:00',
            referenceWebsites: [{ url: 'https://inari.jp', title: 'Official' }],
            images: [{ id: 2, filename: 'attr1.jpg', title: 'a' }],
            sortOrder: 0,
          },
          {
            id: 101,
            name: 'Kyoto Station',
            googleMapUrl: null,
            notes: null,
            nearbyAttractions: null,
            startTime: '12:00',
            endTime: '13:00',
            referenceWebsites: [],
            images: [],
            sortOrder: 1,
          },
        ],
        connections: [
          {
            id: 200,
            fromAttractionId: 100,
            toAttractionId: 101,
            transportMode: 'walk',
            duration: '10 min',
            route: null,
            notes: null,
            images: [{ id: 3, filename: 'conn1.jpg', title: 'c' }],
          },
        ],
        images: [{ id: 4, filename: 'day1.jpg', title: 'd' }],
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
    occasions: [{ id: 600, name: 'Packing', checks: { 400: true } }],
  },
};

function sampleImageBuffers(): Map<string, Buffer> {
  return new Map([
    ['trip1.jpg', Buffer.from('trip-bytes')],
    ['attr1.jpg', Buffer.from('attr-bytes')],
    ['conn1.jpg', Buffer.from('conn-bytes')],
    ['day1.jpg', Buffer.from('day-bytes')],
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConnection.mockResolvedValue(makeConn());
  mockSaveImportedImageBuffer.mockImplementation(
    (_buffer: Buffer, originalFilename: string) => `new-${originalFilename}`,
  );
});

describe('generateUniqueTripTitle', () => {
  it('returns the title unchanged when no trip uses it', async () => {
    mockPoolExecute.mockResolvedValue([[{ title: 'Other Trip' }]]);

    await expect(generateUniqueTripTitle('Kyoto Trip')).resolves.toBe(
      'Kyoto Trip',
    );
  });

  it('appends " (2)" when the title is already used', async () => {
    mockPoolExecute.mockResolvedValue([[{ title: 'Kyoto Trip' }]]);

    await expect(generateUniqueTripTitle('Kyoto Trip')).resolves.toBe(
      'Kyoto Trip (2)',
    );
  });

  it('finds the next available suffix when earlier ones are taken', async () => {
    mockPoolExecute.mockResolvedValue([
      [{ title: 'Kyoto Trip' }, { title: 'Kyoto Trip (2)' }],
    ]);

    await expect(generateUniqueTripTitle('Kyoto Trip')).resolves.toBe(
      'Kyoto Trip (3)',
    );
  });

  it('de-duplicates titles containing emoji/CJK characters correctly', async () => {
    mockPoolExecute.mockResolvedValue([[{ title: '東京 🗼 五日遊' }]]);

    await expect(generateUniqueTripTitle('東京 🗼 五日遊')).resolves.toBe(
      '東京 🗼 五日遊 (2)',
    );
  });
});

describe('importSingleTrip', () => {
  it('imports the full trip tree with every ID remapped, then copies images', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();

    const result = await importSingleTrip(sampleData, sampleImageBuffers());

    expect(result).toEqual({
      originalTripId: 1,
      newTripId: 1000,
      title: 'Kyoto Trip',
    });
    expect(mockConnCommit).toHaveBeenCalled();
    expect(mockConnRollback).not.toHaveBeenCalled();

    // The trip row itself.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trips'),
      [
        'Kyoto Trip',
        'Kyoto',
        '2024-05-10',
        '2024-05-11',
        null,
        expect.any(Date),
      ],
    );

    // The day, carrying its notes across.
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO trip_days (trip_id, day, date, notes) VALUES (?, ?, ?, ?)',
      [1000, 1, '2024-05-10', 'day notes'],
    );

    // Locations reindexed under the new day id.
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO trip_day_locations (trip_day_id, name, sort_order) VALUES (?, ?, ?)',
      [1001, 'Kyoto Station', 0],
    );

    // Both attractions under the new day id, original sortOrder preserved.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_attractions'),
      [1001, 'Fushimi Inari', null, null, null, '09:00', '11:00', 0],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_attractions'),
      [1001, 'Kyoto Station', null, null, null, '12:00', '13:00', 1],
    );

    // Reference website under the new attraction id.
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
      [2000, 'https://inari.jp', 'Official'],
    );

    // The connection uses the *new* attraction ids, not the original 100/101.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_connections'),
      [1001, 2000, 2001, 'walk', '10 min', null, null],
    );

    // Checklist: category -> item -> spec, all remapped under new parent ids.
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
      [1000, 'Clothes'],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_trip_items'),
      [4000, 'Jacket', 1, null, null],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_trip_item_specs'),
      [5000, 'Size M', null],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
      [1000, 'Packing'],
    );
    // The checked item references the new item id (5000), not the original 400.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_checks'),
      [6000, 5000],
    );

    // Every image copied under its new parent id, with a freshly-generated filename.
    expect(mockAddTripImage).toHaveBeenCalledWith(
      1000,
      'new-trip1.jpg',
      'cover',
    );
    expect(mockAddDayImage).toHaveBeenCalledWith(1001, 'new-day1.jpg', 'd');
    expect(mockAddAttractionImage).toHaveBeenCalledWith(
      2000,
      'new-attr1.jpg',
      'a',
    );
    expect(mockAddConnectionImage).toHaveBeenCalledWith(
      3000,
      'new-conn1.jpg',
      'c',
    );
    expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
  });

  it('uses the de-duplicated title from generateUniqueTripTitle', async () => {
    mockPoolExecute.mockImplementation((sql: string) => {
      if (sql.includes('SELECT title FROM trips')) {
        return Promise.resolve([[{ title: 'Kyoto Trip' }]]);
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });
    mockSequentialInserts();

    const result = await importSingleTrip(
      { ...sampleData, checklist: null },
      sampleImageBuffers(),
    );

    expect(result.title).toBe('Kyoto Trip (2)');
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trips'),
      expect.arrayContaining(['Kyoto Trip (2)']),
    );
  });

  it('skips the checklist subtree entirely when checklist is null', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();

    await importSingleTrip(
      { ...sampleData, checklist: null },
      sampleImageBuffers(),
    );

    const checklistCalls = mockConnExecute.mock.calls.filter(([sql]) =>
      String(sql).includes('checklist'),
    );
    expect(checklistCalls).toHaveLength(0);
  });

  it('imports a minimal trip with no days, attractions, or images', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const minimalData: TripBackupData = {
      trip: {
        id: 1,
        title: 'Empty Trip',
        destination: null,
        startDate: '2024-05-10',
        endDate: '2024-05-10',
        description: null,
        images: [],
      },
      content: { tripId: 1, days: [] },
      checklist: null,
    };

    const result = await importSingleTrip(minimalData, new Map());

    expect(result).toEqual({
      originalTripId: 1,
      newTripId: 1000,
      title: 'Empty Trip',
    });
    expect(mockConnCommit).toHaveBeenCalled();
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trips'),
      expect.anything(),
    );
    expect(mockConnExecute).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_days'),
      expect.anything(),
    );
    expect(mockSaveImportedImageBuffer).not.toHaveBeenCalled();
  });

  it('rolls back and writes no images when a database insert fails', async () => {
    mockNoTitleConflicts();
    let callCount = 0;
    mockConnExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT INTO trips')) {
        return Promise.resolve([{ insertId: 1000 }]);
      }
      if (sql.startsWith('INSERT INTO trip_days')) {
        callCount++;
        return Promise.reject(new Error('db error'));
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    await expect(
      importSingleTrip(sampleData, sampleImageBuffers()),
    ).rejects.toThrow('db error');

    expect(callCount).toBe(1);
    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
    expect(mockConnRelease).toHaveBeenCalled();
    expect(mockSaveImportedImageBuffer).not.toHaveBeenCalled();
    expect(mockPoolExecute).not.toHaveBeenCalledWith(
      'DELETE FROM trips WHERE id = ?',
      expect.anything(),
    );
  });

  it('rolls back when a connection references an attraction that was never imported', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const corrupted: TripBackupData = {
      ...sampleData,
      checklist: null,
      content: {
        tripId: 1,
        days: [
          {
            ...sampleData.content.days[0],
            attractions: [],
          },
        ],
      },
    };

    await expect(
      importSingleTrip(corrupted, sampleImageBuffers()),
    ).rejects.toThrow(/references an attraction that was not imported/);

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
  });

  it('rolls back when an occasion check references a checklist item that was never imported', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const corrupted: TripBackupData = {
      ...sampleData,
      checklist: {
        tripId: 1,
        categories: [],
        occasions: [{ id: 600, name: 'Packing', checks: { 999: true } }],
      },
    };

    await expect(
      importSingleTrip(corrupted, sampleImageBuffers()),
    ).rejects.toThrow(/references checklist item 999 that was not imported/);

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
  });

  it('skips a check explicitly set to false without inserting a row', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const data: TripBackupData = {
      ...sampleData,
      checklist: {
        tripId: 1,
        categories: [],
        occasions: [{ id: 600, name: 'Packing', checks: { 400: false } }],
      },
    };

    await importSingleTrip(data, sampleImageBuffers());

    expect(mockConnExecute).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_checks'),
      expect.anything(),
    );
  });

  it('deletes already-written files and the new trip when an image fails partway through', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    mockSaveImportedImageBuffer.mockImplementation(
      (_buffer: Buffer, originalFilename: string) => {
        if (originalFilename === 'conn1.jpg') {
          throw new Error('disk full');
        }
        return `new-${originalFilename}`;
      },
    );

    await expect(
      importSingleTrip(sampleData, sampleImageBuffers()),
    ).rejects.toThrow('disk full');

    expect(mockConnCommit).toHaveBeenCalled();
    // trip1.jpg, day1.jpg, and attr1.jpg are written (in that push order)
    // before conn1.jpg fails; all three must be cleaned up.
    expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('new-trip1.jpg');
    expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('new-day1.jpg');
    expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('new-attr1.jpg');
    expect(mockDeleteImageFromDisk).not.toHaveBeenCalledWith('new-conn1.jpg');
    expect(mockPoolExecute).toHaveBeenCalledWith(
      'DELETE FROM trips WHERE id = ?',
      [1000],
    );
  });

  it('fails and cleans up when a referenced image buffer is missing', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const incompleteBuffers = sampleImageBuffers();
    incompleteBuffers.delete('trip1.jpg');

    await expect(
      importSingleTrip(sampleData, incompleteBuffers),
    ).rejects.toThrow('Missing image data for trip1.jpg');

    expect(mockSaveImportedImageBuffer).not.toHaveBeenCalled();
    expect(mockPoolExecute).toHaveBeenCalledWith(
      'DELETE FROM trips WHERE id = ?',
      [1000],
    );
  });
});

describe('importBackupZip', () => {
  it('imports every trip parsed from the backup', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 1,
        trips: [{ originalTripId: 1, folder: 'trip_1', title: 'Kyoto Trip' }],
      },
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: { ...sampleData, checklist: null },
          imageBuffers: sampleImageBuffers(),
        },
      ],
      template: null,
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'));

    expect(result.imported).toEqual([
      { originalTripId: 1, newTripId: 1000, title: 'Kyoto Trip' },
    ]);
    expect(result.failed).toEqual([]);
    expect(result.templateRestored).toBe(false);
  });

  it('collects a failed entry without aborting the rest when one trip fails', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();

    // Trip A's connection references an attraction that isn't in its own
    // attraction list — a deterministic, data-integrity failure that isn't
    // caught by validation, exercising the per-trip isolation guarantee.
    const brokenDay = {
      ...sampleData.content.days[0],
      attractions: [],
    };
    const tripA: TripBackupData = {
      ...sampleData,
      trip: { ...sampleData.trip, id: 1, title: 'Trip A' },
      checklist: null,
      content: { tripId: 1, days: [brokenDay] },
    };
    const tripB: TripBackupData = {
      ...sampleData,
      trip: { ...sampleData.trip, id: 2, title: 'Trip B' },
      checklist: null,
      content: { tripId: 2, days: [sampleData.content.days[0]] },
    };
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 2,
        trips: [
          { originalTripId: 1, folder: 'trip_1', title: 'Trip A' },
          { originalTripId: 2, folder: 'trip_2', title: 'Trip B' },
        ],
      },
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: tripA,
          imageBuffers: sampleImageBuffers(),
        },
        {
          originalTripId: 2,
          folder: 'trip_2',
          data: tripB,
          imageBuffers: sampleImageBuffers(),
        },
      ],
      template: null,
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'));

    expect(result.failed).toEqual([
      {
        originalTripId: 1,
        title: 'Trip A',
        error: 'Connection 200 references an attraction that was not imported',
      },
    ]);
    expect(result.imported).toEqual([
      { originalTripId: 2, newTripId: 1000, title: 'Trip B' },
    ]);
  });

  it('restores the template when restoreTemplate is true and the backup includes one', async () => {
    mockTemplateInserts();
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 0,
        trips: [],
        includesTemplate: true,
      },
      trips: [],
      template: {
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
                specs: [{ id: 1, name: 'Size M', storage_location: null }],
              },
            ],
          },
        ],
      },
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(result.templateRestored).toBe(true);
    expect(mockConnExecute).toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_template_categories (name) VALUES (?)',
      ['Documents'],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_template_items'),
      [7000, 'Passport', 1, null, null],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_template_item_specs'),
      [8000, 'Size M', null],
    );
    expect(mockConnCommit).toHaveBeenCalled();
  });

  it('restores an empty template (no categories) by just clearing the existing one', async () => {
    mockTemplateInserts();
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 0,
        trips: [],
        includesTemplate: true,
      },
      trips: [],
      template: { categories: [] },
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(result.templateRestored).toBe(true);
    expect(mockConnExecute).toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
    expect(mockConnExecute).not.toHaveBeenCalledWith(
      'INSERT INTO checklist_template_categories (name) VALUES (?)',
      expect.anything(),
    );
    expect(mockConnCommit).toHaveBeenCalled();
  });

  it('does not restore the template when restoreTemplate is not requested', async () => {
    mockTemplateInserts();
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 0,
        trips: [],
        includesTemplate: true,
      },
      trips: [],
      template: { categories: [{ id: 1, name: 'Documents', items: [] }] },
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'));

    expect(result.templateRestored).toBe(false);
    expect(mockConnExecute).not.toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
  });

  it('does not restore the template when requested but the backup has none', async () => {
    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 0,
        trips: [],
      },
      trips: [],
      template: null,
    };
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(result.templateRestored).toBe(false);
    expect(mockGetConnection).not.toHaveBeenCalled();
  });

  it('leaves already-successful trip results intact when template restore fails', async () => {
    mockNoTitleConflicts();
    let attractionCounter = 2000;
    mockConnExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT INTO trips')) {
        return Promise.resolve([{ insertId: 1000 }]);
      }
      if (sql.startsWith('INSERT INTO trip_days')) {
        return Promise.resolve([{ insertId: 1001 }]);
      }
      if (sql.startsWith('INSERT INTO trip_attractions')) {
        return Promise.resolve([{ insertId: attractionCounter++ }]);
      }
      if (sql.startsWith('INSERT INTO trip_connections')) {
        return Promise.resolve([{ insertId: 3000 }]);
      }
      if (sql.startsWith('DELETE FROM checklist_template_categories')) {
        return Promise.reject(new Error('template db error'));
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    const parsed: ParsedBackup = {
      manifest: {
        formatVersion: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tripCount: 1,
        trips: [{ originalTripId: 1, folder: 'trip_1', title: 'Kyoto Trip' }],
        includesTemplate: true,
      },
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: { ...sampleData, checklist: null },
          imageBuffers: sampleImageBuffers(),
        },
      ],
      template: { categories: [{ id: 1, name: 'Documents', items: [] }] },
    };
    mockParseBackupZip.mockReturnValue(parsed);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(result.imported).toEqual([
      { originalTripId: 1, newTripId: 1000, title: 'Kyoto Trip' },
    ]);
    expect(result.failed).toEqual([]);
    expect(result.templateRestored).toBe(false);
    expect(mockConnRollback).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
