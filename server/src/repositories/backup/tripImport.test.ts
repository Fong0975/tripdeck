import type { ChecklistOccasion, TripChecklist } from '@tripdeck/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockSaveImportedImageBuffer = vi.fn();
const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../storage/imageFiles', () => ({
  saveImportedImageBuffer: (...args: unknown[]) =>
    mockSaveImportedImageBuffer(...args),
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

const mockAddTripImage = vi.fn();
const mockAddDayImage = vi.fn();
const mockAddAttractionImage = vi.fn();
const mockAddConnectionImage = vi.fn();
vi.mock('../image', () => ({
  addTripImage: (...args: unknown[]) => mockAddTripImage(...args),
  addDayImage: (...args: unknown[]) => mockAddDayImage(...args),
  addAttractionImage: (...args: unknown[]) => mockAddAttractionImage(...args),
  addConnectionImage: (...args: unknown[]) => mockAddConnectionImage(...args),
}));

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { computeGeoKey } from '../../maps/geoKey';
import { db, routeSql } from '../../test-utils/dbMocks';
import { mockLogger } from '../../test-utils/loggerMock';
import type { TripBackupData } from '../../types/backup';

import { TripImportDataError } from './errors';
import { importSingleTrip } from './tripImport';

const mockPoolExecute = db.pool.execute;
const {
  execute: mockConnExecute,
  query: mockConnQuery,
  commit: mockConnCommit,
  rollback: mockConnRollback,
  release: mockConnRelease,
} = db.conn;

/** No title conflicts by default; individual tests override for dedup cases. */
function mockNoTitleConflicts() {
  routeSql(
    mockPoolExecute,
    [['SELECT title FROM trips', [[]]]],
    [{ affectedRows: 1 }],
  );
}

/**
 * Assigns a fresh insertId per table, in insertion order, so the test can
 * assert that later inserts (e.g. connections, checks) use the *new* ids.
 */
function mockSequentialInserts() {
  let attractionCounter = 2000;
  let specCounter = 7000;
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
    if (sql.startsWith('INSERT INTO checklist_trip_item_specs')) {
      return Promise.resolve([{ insertId: specCounter++ }]);
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  });
  // trip_day_locations, trip_attraction_websites, checklist_checks,
  // checklist_spec_checks: batched leaf inserts, no insertId consumed.
  mockConnQuery.mockResolvedValue([{ affectedRows: 1 }]);
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
            latitude: 34.9671,
            longitude: 135.7727,
            geoSource: 'geocode',
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
            latitude: null,
            longitude: null,
            geoSource: null,
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
    occasions: [
      {
        id: 600,
        name: 'Packing',
        checks: { 400: true },
        specChecks: { 500: true },
      },
    ],
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
  mockSaveImportedImageBuffer.mockImplementation(
    (_buffer: Buffer, originalFilename: string) => `new-${originalFilename}`,
  );
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
    expect(mockConnQuery).toHaveBeenCalledWith(
      'INSERT INTO trip_day_locations (trip_day_id, name, sort_order) VALUES ?',
      [[[1001, 'Kyoto Station', 0]]],
    );

    // Both attractions under the new day id, original sortOrder preserved.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_attractions'),
      [
        1001,
        'Fushimi Inari',
        null,
        null,
        null,
        '09:00',
        '11:00',
        0,
        34.9671,
        135.7727,
        'geocode',
        computeGeoKey('Fushimi Inari', null),
      ],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_attractions'),
      [
        1001,
        'Kyoto Station',
        null,
        null,
        null,
        '12:00',
        '13:00',
        1,
        null,
        null,
        null,
        null,
      ],
    );

    // Reference website under the new attraction id.
    expect(mockConnQuery).toHaveBeenCalledWith(
      'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES ?',
      [[[2000, 'https://inari.jp', 'Official']]],
    );

    // The connection uses the *new* attraction ids, not the original 100/101.
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO trip_connections'),
      [1001, 2000, 2001, 'walk', '10 min', null, null],
    );

    // Checklist: category -> item -> spec, all remapped under new parent ids.
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)',
      [1000, 'Clothes', 0],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_trip_items'),
      [4000, 'Jacket', 1, null, null, 0],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
      [5000, 'Size M', null],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_occasions (trip_id, name) VALUES (?, ?)',
      [1000, 'Packing'],
    );
    // The item has specs, so its own check (400) is unused and not imported.
    expect(mockConnQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_checks'),
      expect.anything(),
    );
    // The checked spec references the new spec id (7000), not the original 500.
    expect(mockConnQuery).toHaveBeenCalledWith(
      'INSERT INTO checklist_spec_checks (checklist_occasion_id, checklist_trip_item_spec_id, location, checked) VALUES ?',
      [[[6000, 7000, '', 1]]],
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

  it('uses the de-duplicated title and skips the checklist subtree when checklist is null', async () => {
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
    const checklistCalls = [
      ...mockConnExecute.mock.calls,
      ...mockConnQuery.mock.calls,
    ].filter(([sql]) => String(sql).includes('checklist'));
    expect(checklistCalls).toHaveLength(0);
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
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Trip import transaction failed, rolled back',
      expect.objectContaining({ originalTripId: sampleData.trip.id }),
      expect.any(Error),
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
    ).rejects.toBeInstanceOf(TripImportDataError);

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Trip import consistency error',
      expect.objectContaining({
        message: expect.stringContaining(
          'references an attraction that was not imported',
        ),
      }),
    );
  });

  it('rolls back when an occasion check references a checklist item that was never imported', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const corrupted: TripBackupData = {
      ...sampleData,
      checklist: {
        tripId: 1,
        categories: [],
        occasions: [
          { id: 600, name: 'Packing', checks: { 999: true }, specChecks: {} },
        ],
      },
    };

    await expect(
      importSingleTrip(corrupted, sampleImageBuffers()),
    ).rejects.toThrow(/references checklist item 999 that was not imported/);

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
  });

  describe('check locations', () => {
    /**
     * Backup whose item (400) is filed under 託運,隨身 and has one spec (500)
     * without a location of its own, as older backups stored it. The item
     * itself holds no location after import.
     */
    function dataWithChecks(
      checks: Record<string, boolean>,
      specChecks: Record<string, boolean>,
      specLocation: string | null = null,
    ): TripBackupData {
      return {
        ...sampleData,
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
                  storage_location: '託運,隨身',
                  specs: [
                    { id: 500, name: 'Size M', storage_location: specLocation },
                  ],
                },
              ],
            },
          ],
          occasions: [{ id: 600, name: 'Packing', checks, specChecks }],
        },
      };
    }

    /** Backup whose item (400) has no specs and is filed under 託運,隨身. */
    function dataWithPlainItem(
      checks: Record<string, boolean>,
    ): TripBackupData {
      const base = dataWithChecks(checks, {});
      const checklist = base.checklist as TripChecklist;
      return {
        ...base,
        checklist: {
          ...checklist,
          categories: [
            {
              ...checklist.categories[0],
              items: [{ ...checklist.categories[0].items[0], specs: [] }],
            },
          ],
        },
      };
    }

    function insertParams(tablePrefix: string): unknown[] {
      return mockConnExecute.mock.calls
        .filter(([sql]) => String(sql).startsWith(tablePrefix))
        .map(([, params]) => params);
    }

    function insertedRows(table: string): unknown[] {
      return mockConnQuery.mock.calls
        .filter(([sql]) => String(sql).startsWith(`INSERT INTO ${table} `))
        .flatMap(([, params]) => (params as unknown[][])[0]);
    }

    it.each([
      {
        name: 'spreads a legacy id-only spec key over every location of the spec',
        checks: { 400: true },
        specChecks: { 500: true },
        specLocation: null,
        expectedChecks: [],
        expectedSpecChecks: [
          [6000, 7000, '託運', 1],
          [6000, 7000, '隨身', 1],
        ],
      },
      {
        name: 'keeps a location-specific spec key at its own location only',
        checks: { '400|隨身': true },
        specChecks: { '500|託運': true },
        specLocation: null,
        expectedChecks: [],
        expectedSpecChecks: [[6000, 7000, '託運', 1]],
      },
      {
        name: 'returns a location reached by several keys once',
        checks: {},
        specChecks: { '500|隨身': true, 500: true },
        specLocation: '隨身',
        expectedChecks: [],
        expectedSpecChecks: [[6000, 7000, '隨身', 1]],
      },
    ])(
      '$name',
      async ({
        checks,
        specChecks,
        specLocation,
        expectedChecks,
        expectedSpecChecks,
      }) => {
        mockNoTitleConflicts();
        mockSequentialInserts();

        await importSingleTrip(
          dataWithChecks(checks, specChecks, specLocation),
          sampleImageBuffers(),
        );

        expect(insertedRows('checklist_checks')).toEqual(expectedChecks);
        expect(insertedRows('checklist_spec_checks')).toEqual(
          expectedSpecChecks,
        );
      },
    );

    it('spreads a legacy key of an item without specs over its locations', async () => {
      mockNoTitleConflicts();
      mockSequentialInserts();

      await importSingleTrip(
        dataWithPlainItem({ 400: true }),
        sampleImageBuffers(),
      );

      expect(insertedRows('checklist_checks')).toEqual([
        [6000, 5000, '託運', 1],
        [6000, 5000, '隨身', 1],
      ]);
      expect(insertParams('INSERT INTO checklist_trip_items')).toEqual([
        [4000, 'Jacket', 1, null, '託運,隨身', 0],
      ]);
    });

    it('rolls back on an item check at a location the item does not have', async () => {
      mockNoTitleConflicts();
      mockSequentialInserts();

      await expect(
        importSingleTrip(
          dataWithPlainItem({ '400|': true }),
          sampleImageBuffers(),
        ),
      ).rejects.toThrow(
        /checks checklist item 400 at location "" that it does not have/,
      );

      expect(mockConnRollback).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'takes over the location of its item when it has none',
        specLocation: null,
        expectedSpecLocation: '託運,隨身',
      },
      {
        name: 'keeps its own location over the one of its item',
        specLocation: '隨身',
        expectedSpecLocation: '隨身',
      },
    ])(
      'stores the location on a spec that $name and none on its item',
      async ({ specLocation, expectedSpecLocation }) => {
        mockNoTitleConflicts();
        mockSequentialInserts();

        await importSingleTrip(
          dataWithChecks({}, {}, specLocation),
          sampleImageBuffers(),
        );

        expect(insertParams('INSERT INTO checklist_trip_items')).toEqual([
          [4000, 'Jacket', 1, null, null, 0],
        ]);
        expect(insertParams('INSERT INTO checklist_trip_item_specs')).toEqual([
          [5000, 'Size M', expectedSpecLocation],
        ]);
      },
    );

    it('skips the checks of an item with specs without validating them', async () => {
      mockNoTitleConflicts();
      mockSequentialInserts();

      await importSingleTrip(
        dataWithChecks({ '400|後背包': true, '400|': true, 400: true }, {}),
        sampleImageBuffers(),
      );

      expect(insertedRows('checklist_checks')).toEqual([]);
      expect(mockConnCommit).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'a spec check at a location the spec does not have',
        checks: {},
        specChecks: { '500|後背包': true },
        message:
          /checks checklist spec 500 at location "後背包" that it does not have/,
      },
      {
        name: 'a key whose id is not an integer',
        checks: { 'abc|託運': true },
        specChecks: {},
        message: /references checklist item abc\|託運 that was not imported/,
      },
    ])('rolls back on $name', async ({ checks, specChecks, message }) => {
      mockNoTitleConflicts();
      mockSequentialInserts();

      await expect(
        importSingleTrip(
          dataWithChecks(checks, specChecks),
          sampleImageBuffers(),
        ),
      ).rejects.toThrow(message);

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });
  });

  it('skips a check explicitly set to false without inserting a row', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const data: TripBackupData = {
      ...sampleData,
      checklist: {
        tripId: 1,
        categories: [],
        occasions: [
          { id: 600, name: 'Packing', checks: { 400: false }, specChecks: {} },
        ],
      },
    };

    await importSingleTrip(data, sampleImageBuffers());

    expect(mockConnQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_checks'),
      expect.anything(),
    );
  });

  it('rolls back when an occasion spec check references a spec that was never imported', async () => {
    mockNoTitleConflicts();
    mockSequentialInserts();
    const corrupted: TripBackupData = {
      ...sampleData,
      checklist: {
        tripId: 1,
        categories: [],
        occasions: [
          { id: 600, name: 'Packing', checks: {}, specChecks: { 999: true } },
        ],
      },
    };

    await expect(
      importSingleTrip(corrupted, sampleImageBuffers()),
    ).rejects.toThrow(/references checklist spec 999 that was not imported/);

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'explicitly false', specChecks: { 500: false } },
    { name: 'missing (backup predates spec checks)', specChecks: undefined },
  ])(
    'inserts no spec check row when specChecks is $name',
    async ({ specChecks }) => {
      mockNoTitleConflicts();
      mockSequentialInserts();
      const checklist = sampleData.checklist as TripChecklist;
      const data: TripBackupData = {
        ...sampleData,
        checklist: {
          ...checklist,
          occasions: [
            {
              id: 600,
              name: 'Packing',
              checks: { 400: true },
              specChecks,
            } as ChecklistOccasion,
          ],
        },
      };

      await importSingleTrip(data, sampleImageBuffers());

      expect(mockConnQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO checklist_spec_checks'),
        expect.anything(),
      );
      expect(mockConnCommit).toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: 'locations of one day',
      table: 'trip_day_locations',
      expectedRows: [
        [1001, 'Kyoto Station', 0],
        [1001, 'Gion', 1],
      ],
    },
    {
      name: 'websites of several attractions',
      table: 'trip_attraction_websites',
      expectedRows: [
        [2000, 'https://inari.jp', 'Official'],
        [2000, 'https://inari.jp/map', 'Map'],
        [2001, 'https://station.jp', 'Station'],
      ],
    },
    {
      name: 'checks of several occasions',
      table: 'checklist_checks',
      expectedRows: [
        [6000, 5000, '', 1],
        [6001, 5000, '', 1],
        [6001, 5001, '', 1],
      ],
    },
    {
      name: 'spec checks of several occasions',
      table: 'checklist_spec_checks',
      expectedRows: [
        [6000, 7000, '', 1],
        [6001, 7000, '', 1],
        [6001, 7001, '', 1],
      ],
    },
  ])(
    'sends all rows as one multi-row insert for $name',
    async ({ table, expectedRows }) => {
      mockNoTitleConflicts();
      let itemId = 5000;
      let occasionId = 6000;
      mockSequentialInserts();
      const baseImpl = mockConnExecute.getMockImplementation();
      mockConnExecute.mockImplementation((sql: string, params: unknown) => {
        if (sql.startsWith('INSERT INTO checklist_trip_items')) {
          return Promise.resolve([{ insertId: itemId++ }]);
        }
        if (sql.startsWith('INSERT INTO checklist_occasions')) {
          return Promise.resolve([{ insertId: occasionId++ }]);
        }
        return baseImpl?.(sql, params);
      });
      const day = sampleData.content.days[0];
      const data: TripBackupData = {
        ...sampleData,
        content: {
          tripId: 1,
          days: [
            {
              ...day,
              locations: [...day.locations, { id: 51, name: 'Gion' }],
              attractions: [
                {
                  ...day.attractions[0],
                  referenceWebsites: [
                    ...day.attractions[0].referenceWebsites,
                    { url: 'https://inari.jp/map', title: 'Map' },
                  ],
                },
                {
                  ...day.attractions[1],
                  referenceWebsites: [
                    { url: 'https://station.jp', title: 'Station' },
                  ],
                },
              ],
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
                  specs: [],
                },
                {
                  id: 401,
                  name: 'Socks',
                  quantity: 2,
                  notes: null,
                  storage_location: null,
                  specs: [],
                },
                {
                  id: 402,
                  name: 'Shirt',
                  quantity: 3,
                  notes: null,
                  storage_location: null,
                  specs: [
                    { id: 500, name: 'Size M', storage_location: null },
                    { id: 501, name: 'Pair', storage_location: 'Drawer' },
                  ],
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
            {
              id: 601,
              name: 'Return',
              checks: { 400: true, 401: true },
              specChecks: { 500: true, 501: true },
            },
          ],
        },
      };

      await importSingleTrip(data, sampleImageBuffers());

      const tableCalls = mockConnQuery.mock.calls.filter(([sql]) =>
        String(sql).startsWith(`INSERT INTO ${table} `),
      );
      expect(tableCalls).toHaveLength(1);
      expect(tableCalls[0][1]).toEqual([expectedRows]);
    },
  );

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
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to write imported trip images; rolling back the new trip',
      expect.objectContaining({ filesWrittenBeforeFailure: 3 }),
      expect.any(Error),
    );
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
    ).rejects.toThrow(
      new TripImportDataError('Missing image data for trip1.jpg'),
    );

    expect(mockSaveImportedImageBuffer).not.toHaveBeenCalled();
    expect(mockPoolExecute).toHaveBeenCalledWith(
      'DELETE FROM trips WHERE id = ?',
      [1000],
    );
  });

  const cleanupFailureLog =
    'Failed to delete partially imported trip during rollback';

  it.each([
    {
      name: 'the trip delete succeeds',
      deleteOutcome: () => Promise.resolve([{ affectedRows: 1 }]),
      expectedCleanupLogs: [],
    },
    {
      name: 'the trip delete itself fails',
      deleteOutcome: () => Promise.reject(new Error('connection lost')),
      expectedCleanupLogs: [
        [
          cleanupFailureLog,
          { newTripId: 1000, title: 'Kyoto Trip' },
          expect.objectContaining({ message: 'connection lost' }),
        ],
      ],
    },
  ])(
    'rethrows the original image error when $name',
    async ({ deleteOutcome, expectedCleanupLogs }) => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.startsWith('DELETE FROM trips')) {
          return deleteOutcome();
        }
        return Promise.resolve([[]]);
      });
      mockSequentialInserts();
      const imageError = new Error('disk full');
      mockSaveImportedImageBuffer.mockImplementation(() => {
        throw imageError;
      });

      await expect(
        importSingleTrip(sampleData, sampleImageBuffers()),
      ).rejects.toBe(imageError);

      expect(mockPoolExecute).toHaveBeenCalledWith(
        'DELETE FROM trips WHERE id = ?',
        [1000],
      );
      const cleanupLogs = mockLogger.error.mock.calls.filter(
        ([message]) => message === cleanupFailureLog,
      );
      expect(cleanupLogs).toEqual(expectedCleanupLogs);
    },
  );
});
