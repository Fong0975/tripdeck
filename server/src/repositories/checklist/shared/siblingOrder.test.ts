import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import {
  nextSiblingOrder,
  type OrderedChecklistTable,
  reorderSiblings,
} from './siblingOrder';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const {
  execute: mockConnExecute,
  commit: mockConnCommit,
  rollback: mockConnRollback,
} = db.conn;

function updateCalls(): Array<[string, unknown[]]> {
  return mockConnExecute.mock.calls.filter(([sql]) =>
    String(sql).startsWith('UPDATE'),
  ) as Array<[string, unknown[]]>;
}

describe('siblingOrder', () => {
  beforeEach(() => {
    mockConnExecute.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
  });

  describe('reorderSiblings', () => {
    it.each<{
      name: string;
      table: OrderedChecklistTable;
      parentId: number | null;
      stored: number[];
      ordered: unknown[];
      expected: 'reordered' | 'invalid_order';
      lockSql: string;
      lockParams: unknown[];
      updateParams: unknown[] | null;
    }>([
      {
        name: 'a trip item group in a new order',
        table: 'checklist_trip_items',
        parentId: 5,
        stored: [1, 2, 3],
        ordered: [3, 1, 2],
        expected: 'reordered',
        lockSql:
          'SELECT id FROM checklist_trip_items WHERE checklist_trip_category_id = ? ORDER BY sort_order, id FOR UPDATE',
        lockParams: [5],
        updateParams: [3, 0, 1, 1, 2, 2, 3, 1, 2],
      },
      {
        name: 'the global template category list',
        table: 'checklist_template_categories',
        parentId: null,
        stored: [4, 8],
        ordered: [8, 4],
        expected: 'reordered',
        lockSql:
          'SELECT id FROM checklist_template_categories  ORDER BY sort_order, id FOR UPDATE',
        lockParams: [],
        updateParams: [8, 0, 4, 1, 8, 4],
      },
      {
        name: 'an empty group',
        table: 'checklist_trip_categories',
        parentId: 1,
        stored: [],
        ordered: [],
        expected: 'reordered',
        lockSql:
          'SELECT id FROM checklist_trip_categories WHERE trip_id = ? ORDER BY sort_order, id FOR UPDATE',
        lockParams: [1],
        updateParams: null,
      },
      {
        name: 'a partial list',
        table: 'checklist_template_items',
        parentId: 2,
        stored: [1, 2, 3],
        ordered: [1, 2],
        expected: 'invalid_order',
        lockSql:
          'SELECT id FROM checklist_template_items WHERE checklist_template_category_id = ? ORDER BY sort_order, id FOR UPDATE',
        lockParams: [2],
        updateParams: null,
      },
      {
        name: 'an id from another group',
        table: 'checklist_trip_items',
        parentId: 5,
        stored: [1, 2],
        ordered: [1, 99],
        expected: 'invalid_order',
        lockSql:
          'SELECT id FROM checklist_trip_items WHERE checklist_trip_category_id = ? ORDER BY sort_order, id FOR UPDATE',
        lockParams: [5],
        updateParams: null,
      },
    ])(
      'handles $name',
      async ({
        table,
        parentId,
        stored,
        ordered,
        expected,
        lockSql,
        lockParams,
        updateParams,
      }) => {
        mockConnExecute.mockResolvedValue([stored.map(id => ({ id }))]);

        const result = await reorderSiblings(table, parentId, ordered);

        expect(result).toBe(expected);
        expect(mockConnExecute).toHaveBeenNthCalledWith(1, lockSql, lockParams);
        if (updateParams === null) {
          expect(updateCalls()).toHaveLength(0);
        } else {
          expect(updateCalls()).toHaveLength(1);
          expect(updateCalls()[0][1]).toEqual(updateParams);
          expect(updateCalls()[0][0]).toContain(
            `UPDATE ${table} SET sort_order = CASE id`,
          );
        }
        expect(mockConnCommit).toHaveBeenCalled();
      },
    );

    it('rolls back and rethrows when the update fails', async () => {
      mockConnExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockRejectedValueOnce(new Error('boom'));

      await expect(
        reorderSiblings('checklist_trip_items', 5, [1]),
      ).rejects.toThrow('boom');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });
  });

  describe('nextSiblingOrder', () => {
    it.each<{
      name: string;
      table: OrderedChecklistTable;
      parentId: number | null;
      rows: unknown[];
      expected: number;
      sql: string;
      params: unknown[];
    }>([
      {
        name: 'a scoped group with rows',
        table: 'checklist_trip_items',
        parentId: 7,
        rows: [{ next_order: '4' }],
        expected: 4,
        sql: 'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM checklist_trip_items WHERE checklist_trip_category_id = ?',
        params: [7],
      },
      {
        name: 'the unscoped template category list',
        table: 'checklist_template_categories',
        parentId: null,
        rows: [{ next_order: 0 }],
        expected: 0,
        sql: 'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM checklist_template_categories ',
        params: [],
      },
      {
        name: 'an empty result set',
        table: 'checklist_trip_categories',
        parentId: 3,
        rows: [],
        expected: 0,
        sql: 'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM checklist_trip_categories WHERE trip_id = ?',
        params: [3],
      },
    ])(
      'returns the next order for $name',
      async ({ table, parentId, rows, expected, sql, params }) => {
        mockConnExecute.mockResolvedValue([rows]);

        const conn = await db.pool.getConnection();
        const result = await nextSiblingOrder(conn, table, parentId);

        expect(result).toBe(expected);
        expect(mockConnExecute).toHaveBeenCalledWith(sql, params);
      },
    );
  });
});
