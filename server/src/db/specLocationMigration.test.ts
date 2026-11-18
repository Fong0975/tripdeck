import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test-utils/dbMocks';
import { mockLogger } from '../test-utils/loggerMock';

import { migrateSpecLocations } from './specLocationMigration';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockPoolExecute = db.pool.execute;

/** Whitespace-normalised SQL of every statement issued so far. */
function statements(): string[] {
  return mockPoolExecute.mock.calls.map(([sql]) =>
    (sql as string).replace(/\s+/g, ' ').trim(),
  );
}

describe('db/specLocationMigration', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockLogger.info.mockClear();
  });

  describe('migrateSpecLocations', () => {
    it.each([
      {
        table: 'checklist_template_item_specs',
        itemTable: 'checklist_template_items',
        parentColumn: 'checklist_template_item_id',
      },
      {
        table: 'checklist_trip_item_specs',
        itemTable: 'checklist_trip_items',
        parentColumn: 'checklist_trip_item_id',
      },
    ])(
      'copies item locations onto the specs of $table, then clears the items',
      async ({ table, itemTable, parentColumn }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

        await migrateSpecLocations();

        const copy = statements().find(sql =>
          sql.startsWith(`UPDATE ${table} s`),
        );
        expect(copy).toBe(
          `UPDATE ${table} s JOIN ${itemTable} i ON i.id = s.${parentColumn} SET s.storage_location = i.storage_location WHERE s.storage_location IS NULL AND i.storage_location IS NOT NULL AND i.storage_location <> ''`,
        );
        const clear = statements().find(sql =>
          sql.startsWith(`UPDATE ${itemTable} i`),
        );
        expect(clear).toBe(
          `UPDATE ${itemTable} i SET i.storage_location = NULL WHERE i.storage_location IS NOT NULL AND EXISTS ( SELECT 1 FROM ${table} s WHERE s.${parentColumn} = i.id )`,
        );
        expect(statements().indexOf(copy as string)).toBeLessThan(
          statements().indexOf(clear as string),
        );
      },
    );

    it('migrates the template tables before the trip tables', async () => {
      mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

      await migrateSpecLocations();

      expect(statements().map(sql => /^UPDATE (\w+)/.exec(sql)?.[1])).toEqual([
        'checklist_template_item_specs',
        'checklist_template_items',
        'checklist_trip_item_specs',
        'checklist_trip_items',
      ]);
    });

    it.each([
      { name: 'rows were moved', affectedRows: 3, logged: 2 },
      { name: 'nothing needed moving', affectedRows: 0, logged: 0 },
    ])(
      'logs once per table only when $name',
      async ({ affectedRows, logged }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        await migrateSpecLocations();

        expect(mockLogger.info).toHaveBeenCalledTimes(logged);
      },
    );

    it.each([
      { name: 'only specs were updated', results: [2, 0], logged: true },
      { name: 'only items were cleared', results: [0, 2], logged: true },
    ])('logs when $name', async ({ results, logged }) => {
      mockPoolExecute
        .mockResolvedValueOnce([{ affectedRows: results[0] }])
        .mockResolvedValueOnce([{ affectedRows: results[1] }])
        .mockResolvedValue([{ affectedRows: 0 }]);

      await migrateSpecLocations();

      expect(mockLogger.info.mock.calls.length > 0).toBe(logged);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Moved item storage locations onto their specs',
        expect.objectContaining({
          specTable: 'checklist_template_item_specs',
          specsUpdated: results[0],
          itemsCleared: results[1],
        }),
      );
    });
  });
});
