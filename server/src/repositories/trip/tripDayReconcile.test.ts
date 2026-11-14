import type { PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDbMock } from '../../test-utils/dbMocks';

import { planTripDayChanges, reconcileTripDays } from './tripDayReconcile';
import type { TripDayRow } from './types';

const mockDeleteTripDaysWithContents = vi.fn();
vi.mock('./tripDayCleanup', () => ({
  deleteTripDaysWithContents: (...args: unknown[]) =>
    mockDeleteTripDaysWithContents(...args),
}));

function dayRow(id: number, date: Date | string): TripDayRow {
  return { id, trip_id: 10, day: id, date, notes: null } as TripDayRow;
}

describe('planTripDayChanges', () => {
  const existing = [
    dayRow(1, '2026-10-01'),
    dayRow(2, '2026-10-02'),
    dayRow(3, '2026-10-03'),
  ];

  it.each([
    {
      name: 'changes nothing when the range is unchanged',
      days: existing,
      start: '2026-10-01',
      end: '2026-10-03',
      expected: { dayIdsToRemove: [], datesToAdd: [] },
    },
    {
      name: 'adds trailing dates when the end moves later',
      days: existing,
      start: '2026-10-01',
      end: '2026-10-05',
      expected: {
        dayIdsToRemove: [],
        datesToAdd: ['2026-10-04', '2026-10-05'],
      },
    },
    {
      name: 'removes leading days when the start moves later',
      days: existing,
      start: '2026-10-03',
      end: '2026-10-03',
      expected: { dayIdsToRemove: [1, 2], datesToAdd: [] },
    },
    {
      name: 'removes and adds when the range shifts',
      days: existing,
      start: '2026-10-02',
      end: '2026-10-04',
      expected: { dayIdsToRemove: [1], datesToAdd: ['2026-10-04'] },
    },
    {
      name: 'matches days stored as datetime strings by their date part',
      days: [dayRow(7, '2026-10-01T00:00:00.000Z')],
      start: '2026-10-01',
      end: '2026-10-02',
      expected: { dayIdsToRemove: [], datesToAdd: ['2026-10-02'] },
    },
    {
      name: 'adds every date when the trip has no days',
      days: [],
      start: '2026-10-01',
      end: '2026-10-02',
      expected: {
        dayIdsToRemove: [],
        datesToAdd: ['2026-10-01', '2026-10-02'],
      },
    },
  ])('$name', ({ days, start, end, expected }) => {
    expect(planTripDayChanges(days, start, end)).toEqual(expected);
  });
});

describe('reconcileTripDays', () => {
  const db = createDbMock();
  const conn = db.conn as unknown as PoolConnection;

  beforeEach(() => {
    db.conn.execute.mockResolvedValue([{ affectedRows: 1 }]);
  });

  it.each([
    {
      name: 'only renumbers when nothing is added or removed',
      plan: { dayIdsToRemove: [], datesToAdd: [] },
      cleanupFilenames: [],
      remainingIds: [101, 102],
      expectedInserts: [],
      expectedRenumbers: [
        [1, 101],
        [2, 102],
      ],
    },
    {
      name: 'removes days, inserts new dates with negative placeholders, then renumbers',
      plan: { dayIdsToRemove: [101], datesToAdd: ['2026-10-04', '2026-10-05'] },
      cleanupFilenames: ['day101.jpg'],
      remainingIds: [102, 201, 202],
      expectedInserts: [
        [10, -1, '2026-10-04'],
        [10, -2, '2026-10-05'],
      ],
      expectedRenumbers: [
        [1, 102],
        [2, 201],
        [3, 202],
      ],
    },
  ])(
    '$name',
    async ({
      plan,
      cleanupFilenames,
      remainingIds,
      expectedInserts,
      expectedRenumbers,
    }) => {
      mockDeleteTripDaysWithContents.mockResolvedValueOnce(cleanupFilenames);
      db.conn.query.mockResolvedValueOnce([remainingIds.map(id => ({ id }))]);

      const result = await reconcileTripDays(conn, 10, plan);

      expect(result).toEqual(cleanupFilenames);
      expect(mockDeleteTripDaysWithContents).toHaveBeenCalledWith(
        conn,
        plan.dayIdsToRemove,
      );
      const calls = db.conn.execute.mock.calls as [string, unknown[]][];
      expect(
        calls
          .filter(([sql]) => sql.includes('INSERT INTO trip_days'))
          .map(([, params]) => params),
      ).toEqual(expectedInserts);
      expect(calls).toContainEqual([
        'UPDATE trip_days SET day = day + 100000 WHERE trip_id = ?',
        [10],
      ]);
      expect(db.conn.query).toHaveBeenCalledWith(
        'SELECT id FROM trip_days WHERE trip_id = ? ORDER BY date',
        [10],
      );
      expect(
        calls
          .filter(([sql]) =>
            sql.includes('UPDATE trip_days SET day = ? WHERE id'),
          )
          .map(([, params]) => params),
      ).toEqual(expectedRenumbers);
    },
  );

  it('propagates a cleanup failure without touching trip_days further', async () => {
    mockDeleteTripDaysWithContents.mockRejectedValueOnce(new Error('db error'));

    await expect(
      reconcileTripDays(conn, 10, { dayIdsToRemove: [1], datesToAdd: [] }),
    ).rejects.toThrow('db error');

    expect(db.conn.execute).not.toHaveBeenCalled();
  });
});
