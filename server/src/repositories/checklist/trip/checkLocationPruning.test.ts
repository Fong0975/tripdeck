import { describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../../../test-utils/dbMocks';

import { pruneItemChecks, pruneSpecChecks } from './checkLocationPruning';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

/** Normalised `[sql, params]` of every DELETE issued so far. */
function deletes(): Array<[string, unknown[]]> {
  return mockPoolExecute.mock.calls
    .filter(([sql]) => (sql as string).startsWith('DELETE'))
    .map(([sql, params]) => [(sql as string).replace(/\s+/g, ' '), params]);
}

describe('checkLocationPruning', () => {
  describe('pruneItemChecks', () => {
    it.each([
      {
        name: 'keeps only the locations the item still has',
        itemLocation: '託運,隨身',
        specs: [],
        expected: [
          [
            'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?, ?)',
            [5, '託運', '隨身'],
          ],
        ],
      },
      {
        name: 'keeps the empty location when the item lost every location',
        itemLocation: null,
        specs: [],
        expected: [
          [
            'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?)',
            [5, ''],
          ],
        ],
      },
      {
        name: 'prunes only specs that inherit the item location, using it',
        itemLocation: '隨身',
        specs: [
          { id: 1, name: '繼承', storage_location: null },
          { id: 2, name: '自訂', storage_location: '託運' },
        ],
        expected: [
          [
            'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?)',
            [5, '隨身'],
          ],
          [
            'DELETE FROM checklist_spec_checks WHERE checklist_trip_item_spec_id = ? AND location NOT IN (?)',
            [1, '隨身'],
          ],
        ],
      },
    ])('$name', async ({ itemLocation, specs, expected }) => {
      mockPoolExecute.mockReset();
      mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

      await pruneItemChecks(5, itemLocation, specs);

      expect(deletes()).toEqual(expected);
    });
  });

  describe('pruneSpecChecks', () => {
    it('uses the spec location without reading the item when it has one', async () => {
      mockPoolExecute.mockReset();
      mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

      await pruneSpecChecks(9, '託運');

      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
      expect(deletes()).toEqual([
        [
          'DELETE FROM checklist_spec_checks WHERE checklist_trip_item_spec_id = ? AND location NOT IN (?)',
          [9, '託運'],
        ],
      ]);
    });

    it.each([
      {
        itemRows: [{ storage_location: '託運,隨身' }],
        expected: ['託運', '隨身'],
      },
      { itemRows: [{ storage_location: null }], expected: [''] },
      { itemRows: [], expected: [''] },
    ])(
      'inherits the item location when the spec has none ($itemRows)',
      async ({ itemRows, expected }) => {
        mockPoolExecute.mockReset();
        routeSql(
          mockPoolExecute,
          [[sql => sql.trim().startsWith('SELECT'), [itemRows]]],
          [{ affectedRows: 0 }],
        );

        await pruneSpecChecks(9, null);

        expect(deletes()[0][1]).toEqual([9, ...expected]);
      },
    );
  });
});
