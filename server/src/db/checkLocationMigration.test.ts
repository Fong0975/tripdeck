import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test-utils/dbMocks';
import { mockLogger } from '../test-utils/loggerMock';

import { migrateCheckLocations } from './checkLocationMigration';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockPoolExecute = db.pool.execute;

/** Live index names per check table; everything else answers `affectedRows`. */
function setUpLiveDatabase(
  indexes: Record<string, string[]>,
  affectedRows = 0,
): void {
  mockPoolExecute.mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.includes('SELECT DATABASE()')) {
      return Promise.resolve([[{ db: 'test_db' }]]);
    }
    if (sql.includes('information_schema.STATISTICS')) {
      return Promise.resolve([
        (indexes[params?.[1] as string] ?? []).map(i => ({ indexName: i })),
      ]);
    }
    return Promise.resolve([{ affectedRows }]);
  });
}

function statements(prefix: RegExp): string[] {
  return mockPoolExecute.mock.calls
    .map(([sql]) => (sql as string).replace(/\s+/g, ' '))
    .filter(sql => prefix.test(sql));
}

describe('db/checkLocationMigration', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockLogger.info.mockClear();
  });

  describe('migrateCheckLocations', () => {
    it.each([
      {
        name: 'adds the new unique keys before dropping the legacy ones',
        indexes: {
          checklist_checks: ['PRIMARY', 'uq_occasion_item'],
          checklist_spec_checks: ['PRIMARY', 'uq_occasion_spec'],
        },
        expected: [
          'ALTER TABLE checklist_checks ADD UNIQUE KEY uq_occasion_item_location (checklist_occasion_id, checklist_trip_item_id, location)',
          'ALTER TABLE checklist_checks DROP INDEX uq_occasion_item',
          'ALTER TABLE checklist_spec_checks ADD UNIQUE KEY uq_occasion_spec_location (checklist_occasion_id, checklist_trip_item_spec_id, location)',
          'ALTER TABLE checklist_spec_checks DROP INDEX uq_occasion_spec',
        ],
      },
      {
        name: 'leaves already migrated tables untouched',
        indexes: {
          checklist_checks: ['PRIMARY', 'uq_occasion_item_location'],
          checklist_spec_checks: ['PRIMARY', 'uq_occasion_spec_location'],
        },
        expected: [],
      },
      {
        name: 'drops a leftover legacy key even when the new one exists',
        indexes: {
          checklist_checks: [
            'PRIMARY',
            'uq_occasion_item',
            'uq_occasion_item_location',
          ],
          checklist_spec_checks: ['PRIMARY', 'uq_occasion_spec_location'],
        },
        expected: ['ALTER TABLE checklist_checks DROP INDEX uq_occasion_item'],
      },
    ])('$name', async ({ indexes, expected }) => {
      setUpLiveDatabase(indexes);

      await migrateCheckLocations();

      expect(statements(/^ALTER/)).toEqual(expected);
    });

    it('spreads legacy checks over every storage option, then removes them', async () => {
      setUpLiveDatabase({}, 0);

      await migrateCheckLocations();

      const inserts = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).startsWith('INSERT IGNORE INTO'),
      );
      expect(inserts.map(([, params]) => params)).toEqual([
        ['託運', '託運'],
        ['隨身', '隨身'],
        ['託運', '託運'],
        ['隨身', '隨身'],
      ]);
      const deletes = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).startsWith('DELETE c FROM'),
      );
      expect(deletes.map(([, params]) => params)).toEqual([
        ['託運', '隨身'],
        ['託運', '隨身'],
      ]);
    });

    it.each([
      {
        table: 'checklist_checks',
        expectedLocation: 'i.storage_location',
      },
      {
        table: 'checklist_spec_checks',
        expectedLocation: 'COALESCE(s.storage_location, i.storage_location)',
      },
    ])(
      'resolves the unit location of $table checks as $expectedLocation',
      async ({ table, expectedLocation }) => {
        setUpLiveDatabase({}, 0);

        await migrateCheckLocations();

        const tableStatements = statements(new RegExp(`${table} c `));
        expect(tableStatements.length).toBeGreaterThan(0);
        for (const sql of tableStatements) {
          expect(sql).toContain(`FIND_IN_SET(?, REPLACE(${expectedLocation}`);
          expect(sql).toContain("c.location = ''");
        }
      },
    );

    it.each([
      { name: 'rows were migrated', affectedRows: 2, logged: true },
      { name: 'nothing needed migrating', affectedRows: 0, logged: false },
    ])('logs the spread only when $name', async ({ affectedRows, logged }) => {
      setUpLiveDatabase(
        {
          checklist_checks: ['uq_occasion_item_location'],
          checklist_spec_checks: ['uq_occasion_spec_location'],
        },
        affectedRows,
      );

      await migrateCheckLocations();

      const spreadLogs = mockLogger.info.mock.calls.filter(
        ([message]) =>
          message === 'Spread legacy checks over storage locations',
      );
      expect(spreadLogs.length > 0).toBe(logged);
    });
  });
});
