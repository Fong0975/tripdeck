import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

import { db } from '../test-utils/dbMocks';

import { type DayOrderedTable, nextSortOrderInDay } from './daySortOrder';

const conn = db.conn as unknown as PoolConnection;

describe('nextSortOrderInDay', () => {
  it.each<{
    name: string;
    table: DayOrderedTable;
    rows: Record<string, unknown>[];
    expected: number;
  }>([
    {
      name: 'an empty attraction day',
      table: 'trip_attractions',
      rows: [{ next_order: 0 }],
      expected: 0,
    },
    {
      name: 'an attraction day with a gap after a delete',
      table: 'trip_attractions',
      rows: [{ next_order: 5 }],
      expected: 5,
    },
    {
      name: 'a location day where MySQL returns the BIGINT as a string',
      table: 'trip_day_locations',
      rows: [{ next_order: '3' }],
      expected: 3,
    },
    {
      name: 'no result row at all',
      table: 'trip_day_locations',
      rows: [],
      expected: 0,
    },
  ])(
    'locks the day and returns MAX + 1 for $name',
    async ({ table, rows, expected }) => {
      db.conn.execute
        .mockResolvedValueOnce([[{ id: 7 }]])
        .mockResolvedValueOnce([rows]);

      await expect(nextSortOrderInDay(conn, table, 7)).resolves.toBe(expected);

      expect(db.conn.execute.mock.calls).toEqual([
        ['SELECT id FROM trip_days WHERE id = ? FOR UPDATE', [7]],
        [
          `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM ${table} WHERE trip_day_id = ?`,
          [7],
        ],
      ]);
    },
  );
});
