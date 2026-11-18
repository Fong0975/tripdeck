import { describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../../../test-utils/dbMocks';

import { createSpecRepository, type SpecTableConfig } from './specRepository';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

const CONFIGS: Array<{ label: string; config: SpecTableConfig }> = [
  {
    label: 'template',
    config: {
      specTable: 'checklist_template_item_specs',
      itemTable: 'checklist_template_items',
      parentColumn: 'checklist_template_item_id',
    },
  },
  {
    label: 'trip',
    config: {
      specTable: 'checklist_trip_item_specs',
      itemTable: 'checklist_trip_items',
      parentColumn: 'checklist_trip_item_id',
    },
  },
];

function lastSql(): string {
  return mockPoolExecute.mock.calls.at(-1)?.[0] as string;
}

describe('createSpecRepository', () => {
  describe.each(CONFIGS)('$label spec table', ({ config }) => {
    const repo = createSpecRepository(config);

    function specRow(
      id: number,
      itemId: number,
      name: string,
      storage_location: string | null,
    ): Record<string, unknown> {
      return { id, [config.parentColumn]: itemId, name, storage_location };
    }

    describe('fetchByItemIds', () => {
      it.each([
        {
          name: 'returns an empty map without querying for no item ids',
          itemIds: [] as number[],
          rows: [] as Array<Record<string, unknown>>,
          expected: new Map(),
          queries: 0,
        },
        {
          name: 'groups specs by their parent item id in row order',
          itemIds: [1, 2],
          rows: [
            specRow(10, 1, 'A', null),
            specRow(11, 1, 'B', 'x'),
            specRow(12, 2, 'C', null),
          ],
          expected: new Map([
            [
              1,
              [
                { id: 10, name: 'A', storage_location: null },
                { id: 11, name: 'B', storage_location: 'x' },
              ],
            ],
            [2, [{ id: 12, name: 'C', storage_location: null }]],
          ]),
          queries: 1,
        },
      ])('$name', async ({ itemIds, rows, expected, queries }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await repo.fetchByItemIds(itemIds);

        expect(result).toEqual(expected);
        expect(mockPoolExecute).toHaveBeenCalledTimes(queries);
        if (queries > 0) {
          expect(lastSql()).toContain(`FROM ${config.specTable}`);
          expect(lastSql()).toContain(`${config.parentColumn} IN (?, ?)`);
          expect(mockPoolExecute.mock.calls[0][1]).toEqual(itemIds);
        }
      });
    });

    describe('create', () => {
      it.each([
        {
          name: 'returns null and skips the insert when the item is missing',
          itemRows: [] as Array<{ id: number }>,
          data: { name: 'Spec' },
          expected: null,
          queries: 1,
        },
        {
          name: 'defaults storage_location to null when omitted',
          itemRows: [{ id: 7 }],
          data: { name: 'Spec' },
          expected: { id: 20, name: 'Spec', storage_location: null },
          queries: 3,
        },
        {
          name: 'keeps a provided storage_location',
          itemRows: [{ id: 7 }],
          data: { name: 'Spec', storage_location: 'bag' },
          expected: { id: 20, name: 'Spec', storage_location: 'bag' },
          queries: 3,
        },
      ])('$name', async ({ itemRows, data, expected, queries }) => {
        routeSql(
          mockPoolExecute,
          [[sql => sql.startsWith('SELECT'), [itemRows]]],
          [{ insertId: 20 }],
        );

        const result = await repo.create(7, data);

        expect(result).toEqual(expected);
        expect(mockPoolExecute).toHaveBeenCalledTimes(queries);
        expect(mockPoolExecute.mock.calls[0][0]).toContain(
          `FROM ${config.itemTable}`,
        );
        if (queries > 1) {
          expect(mockPoolExecute.mock.calls[1][0]).toContain(
            `INSERT INTO ${config.specTable} (${config.parentColumn},`,
          );
          expect(lastSql()).toBe(
            `UPDATE ${config.itemTable} SET storage_location = NULL WHERE id = ?`,
          );
          expect(mockPoolExecute.mock.calls.at(-1)?.[1]).toEqual([7]);
        } else {
          expect(
            mockPoolExecute.mock.calls.map(([sql]) => sql),
          ).not.toContainEqual(expect.stringContaining('UPDATE'));
        }
      });
    });

    describe('update', () => {
      const CURRENT = {
        id: 1,
        [config.parentColumn]: 5,
        name: 'Old',
        storage_location: 'old place',
      };

      it.each([
        {
          name: 'returns null when the spec does not exist',
          rows: [] as Array<typeof CURRENT>,
          data: { name: 'New' },
          expected: null,
        },
        {
          name: 'keeps the current storage_location when omitted',
          rows: [CURRENT],
          data: { name: 'New' },
          expected: { id: 1, name: 'New', storage_location: 'old place' },
        },
        {
          name: 'overrides storage_location when provided',
          rows: [CURRENT],
          data: { name: 'New', storage_location: 'new place' },
          expected: { id: 1, name: 'New', storage_location: 'new place' },
        },
        {
          name: 'clears storage_location when provided as null',
          rows: [CURRENT],
          data: { name: 'New', storage_location: null },
          expected: { id: 1, name: 'New', storage_location: null },
        },
      ])('$name', async ({ rows, data, expected }) => {
        routeSql(
          mockPoolExecute,
          [[sql => sql.startsWith('SELECT'), [rows]]],
          [{ affectedRows: 1 }],
        );

        const result = await repo.update(1, data);

        expect(result).toEqual(expected);
        if (expected) {
          expect(lastSql()).toBe(
            `UPDATE ${config.specTable} SET name = ?, storage_location = ? WHERE id = ?`,
          );
          expect(mockPoolExecute.mock.calls.at(-1)?.[1]).toEqual([
            expected.name,
            expected.storage_location,
            1,
          ]);
        }
      });
    });

    describe('remove', () => {
      it.each([
        { affectedRows: 1, expected: true },
        { affectedRows: 0, expected: false },
      ])(
        'returns $expected when affectedRows is $affectedRows',
        async ({ affectedRows, expected }) => {
          mockPoolExecute.mockResolvedValue([{ affectedRows }]);

          const result = await repo.remove(3);

          expect(result).toBe(expected);
          expect(lastSql()).toBe(
            `DELETE FROM ${config.specTable} WHERE id = ?`,
          );
        },
      );
    });

    describe('belongsToItem', () => {
      it.each([
        { rows: [{ id: 1 }], expected: true },
        { rows: [], expected: false },
      ])(
        'returns $expected when rows.length is $rows.length',
        async ({ rows, expected }) => {
          mockPoolExecute.mockResolvedValue([rows]);

          const result = await repo.belongsToItem(1, 9);

          expect(result).toBe(expected);
          expect(lastSql()).toBe(
            `SELECT id FROM ${config.specTable} WHERE id = ? AND ${config.parentColumn} = ?`,
          );
          expect(mockPoolExecute.mock.calls[0][1]).toEqual([1, 9]);
        },
      );
    });
  });
});
