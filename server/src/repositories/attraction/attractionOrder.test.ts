import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../test-utils/dbMocks';
import type { ImageResponse } from '../../types/trip';
import * as imageRepo from '../imageRepository';

import { moveToDay, updateOrder } from './attractionOrder';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockConnExecute = db.conn.execute;
const mockConnQuery = db.conn.query;
const mockConnCommit = db.conn.commit;
const mockConnRollback = db.conn.rollback;
const mockGetConnection = db.pool.getConnection;

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

vi.mock('../imageRepository', () => ({
  getConnectionImagesBatch: vi.fn(),
}));

describe('attractionOrder', () => {
  beforeEach(() => {
    vi.mocked(imageRepo.getConnectionImagesBatch).mockResolvedValue(new Map());
  });

  describe('updateOrder', () => {
    it('deletes trip_connections that are no longer adjacent under the new order, and keeps ones that still are', async () => {
      // new order: 200 -> pos0, 100 -> pos1, 101 -> pos2
      const orderedIds = [200, 100, 101];
      const connectionRows = [
        { id: 1, trip_attraction_id_from: 100, trip_attraction_id_to: 101 }, // still adjacent (1 -> 2)
        { id: 2, trip_attraction_id_from: 200, trip_attraction_id_to: 101 }, // no longer adjacent (0 -> 2)
        { id: 3, trip_attraction_id_from: 999, trip_attraction_id_to: 100 }, // endpoint not in this day
      ];

      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([connectionRows]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
      vi.mocked(imageRepo.getConnectionImagesBatch).mockResolvedValue(
        new Map([
          [2, [{ id: 20, filename: 'stale-2.jpg', title: 'A' }]],
          [3, [{ id: 30, filename: 'stale-3.jpg', title: 'B' }]],
        ]),
      );

      await updateOrder(10, orderedIds);

      expect(imageRepo.getConnectionImagesBatch).toHaveBeenCalledWith([2, 3]);
      expect(mockConnQuery).toHaveBeenCalledWith(
        'DELETE FROM trip_connections WHERE id IN (?)',
        [[2, 3]],
      );
      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('stale-2.jpg');
      expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('stale-3.jpg');
    });

    it('does not issue a DELETE when every connection is still adjacent', async () => {
      const orderedIds = [100, 101];
      const connectionRows = [
        { id: 1, trip_attraction_id_from: 100, trip_attraction_id_to: 101 },
      ];

      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([connectionRows]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      await updateOrder(10, orderedIds);

      expect(mockConnExecute).toHaveBeenCalledWith(
        expect.stringContaining('trip_connections'),
        [10],
      );
      expect(mockConnQuery).not.toHaveBeenCalled();
      expect(mockConnCommit).toHaveBeenCalled();
      expect(imageRepo.getConnectionImagesBatch).not.toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });

    it('does nothing when orderedIds is empty', async () => {
      await updateOrder(10, []);

      expect(mockGetConnection).not.toHaveBeenCalled();
    });

    it('does not delete any image file when the transaction is rolled back', async () => {
      const connectionRows = [
        { id: 2, trip_attraction_id_from: 200, trip_attraction_id_to: 101 },
      ];
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([connectionRows]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
      vi.mocked(imageRepo.getConnectionImagesBatch).mockResolvedValue(
        new Map([[2, [{ id: 20, filename: 'stale-2.jpg', title: 'A' }]]]),
      );
      mockConnCommit.mockRejectedValueOnce(new Error('commit failed'));

      await expect(updateOrder(10, [100, 101])).rejects.toThrow(
        'commit failed',
      );

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });
  });

  describe('moveToDay', () => {
    interface ConnectionRow {
      id: number;
      trip_attraction_id_from: number;
      trip_attraction_id_to: number;
    }

    interface MoveDb {
      /** Day the attraction currently sits in; null when not in the trip. */
      attractionDayId: number | null;
      targetDayExists: boolean;
      /** Attraction ids per day, in current sort order. */
      dayOrders: Record<number, number[]>;
      /** Connections per day. */
      connections?: Record<number, ConnectionRow[]>;
    }

    /** Day 10 holds 100, 101, 102; day 20 holds 200, 201. */
    const baseDb: MoveDb = {
      attractionDayId: 10,
      targetDayExists: true,
      dayOrders: { 10: [100, 101, 102], 20: [200, 201] },
    };

    function arrangeDb(state: MoveDb): void {
      mockConnExecute.mockImplementation((sql: string, params: unknown[]) => {
        if (sql.includes('JOIN trip_days')) {
          return Promise.resolve([
            state.attractionDayId === null
              ? []
              : [{ trip_day_id: state.attractionDayId }],
          ]);
        }
        if (sql.startsWith('SELECT id FROM trip_days')) {
          return Promise.resolve([
            state.targetDayExists ? [{ id: params[0] }] : [],
          ]);
        }
        if (sql.startsWith('SELECT id FROM trip_attractions')) {
          const ids = state.dayOrders[params[0] as number] ?? [];
          return Promise.resolve([ids.map(id => ({ id }))]);
        }
        if (sql.startsWith('SELECT') && sql.includes('trip_connections')) {
          return Promise.resolve([
            state.connections?.[params[0] as number] ?? [],
          ]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    /** Attraction ids written via sort_order updates for one day, in order. */
    function writtenOrder(dayId: number): number[] {
      return mockConnExecute.mock.calls
        .filter(
          ([sql, params]) =>
            (sql as string).includes('SET sort_order') &&
            (params as number[])[2] === dayId,
        )
        .map(([, params]) => (params as number[])[1]);
    }

    function dayMoveCalls(): unknown[][] {
      return mockConnExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('SET trip_day_id'),
      );
    }

    it.each([
      {
        name: 'inserts at the given index in another day and renumbers both days',
        targetDayId: 20,
        targetIndex: 1,
        expectedSource: [101, 102],
        expectedTarget: [200, 100, 201],
      },
      {
        name: 'inserts at the start of another day when the index is 0',
        targetDayId: 20,
        targetIndex: 0,
        expectedSource: [101, 102],
        expectedTarget: [100, 200, 201],
      },
      {
        name: 'clamps an index past the end to append to another day',
        targetDayId: 20,
        targetIndex: 99,
        expectedSource: [101, 102],
        expectedTarget: [200, 201, 100],
      },
      {
        name: 'appends to an empty day',
        targetDayId: 30,
        targetIndex: 5,
        expectedSource: [101, 102],
        expectedTarget: [100],
      },
    ])(
      '$name',
      async ({ targetDayId, targetIndex, expectedSource, expectedTarget }) => {
        arrangeDb(baseDb);

        const result = await moveToDay(1, 100, targetDayId, targetIndex);

        expect(result).toBe('moved');
        expect(dayMoveCalls()).toEqual([
          [expect.any(String), [targetDayId, 100]],
        ]);
        expect(writtenOrder(10)).toEqual(expectedSource);
        expect(writtenOrder(targetDayId)).toEqual(expectedTarget);
        expect(mockConnCommit).toHaveBeenCalled();
      },
    );

    it('treats a move within the same day as a reorder', async () => {
      arrangeDb(baseDb);

      const result = await moveToDay(1, 100, 10, 2);

      expect(result).toBe('moved');
      expect(dayMoveCalls()).toEqual([]);
      expect(writtenOrder(10)).toEqual([101, 102, 100]);
      expect(mockConnCommit).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'the attraction is not in the trip',
        state: { ...baseDb, attractionDayId: null },
        expected: 'attraction_not_found',
      },
      {
        name: 'the target day is not in the trip',
        state: { ...baseDb, targetDayExists: false },
        expected: 'day_not_found',
      },
    ])('returns $expected when $name', async ({ state, expected }) => {
      arrangeDb(state);

      const result = await moveToDay(1, 100, 20, 0);

      expect(result).toBe(expected);
      expect(dayMoveCalls()).toEqual([]);
      expect(writtenOrder(10)).toEqual([]);
      expect(writtenOrder(20)).toEqual([]);
      expect(mockConnQuery).not.toHaveBeenCalled();
    });

    it('deletes connections broken in both days and unlinks their images after commit', async () => {
      arrangeDb({
        ...baseDb,
        connections: {
          10: [
            // touches the moved attraction -> stale
            { id: 1, trip_attraction_id_from: 100, trip_attraction_id_to: 101 },
            // still adjacent in [101, 102] -> kept
            { id: 2, trip_attraction_id_from: 101, trip_attraction_id_to: 102 },
          ],
          20: [
            // split by the insert at index 1 -> stale
            { id: 3, trip_attraction_id_from: 200, trip_attraction_id_to: 201 },
          ],
        },
      });
      vi.mocked(imageRepo.getConnectionImagesBatch).mockImplementation(ids =>
        Promise.resolve(
          new Map<number, ImageResponse[]>(
            ids.map(id => [
              id,
              [{ id: id * 10, filename: `conn-${id}.jpg`, title: '' }],
            ]),
          ),
        ),
      );
      const callOrder: string[] = [];
      mockConnCommit.mockImplementationOnce(() => {
        callOrder.push('commit');
        return Promise.resolve();
      });
      mockDeleteImageFromDisk.mockImplementation((name: string) => {
        callOrder.push(name);
      });

      await moveToDay(1, 100, 20, 1);

      expect(mockConnQuery).toHaveBeenCalledWith(
        'DELETE FROM trip_connections WHERE id IN (?)',
        [[1]],
      );
      expect(mockConnQuery).toHaveBeenCalledWith(
        'DELETE FROM trip_connections WHERE id IN (?)',
        [[3]],
      );
      expect(callOrder).toEqual(['commit', 'conn-1.jpg', 'conn-3.jpg']);
    });

    it('rolls back and keeps image files when the transaction fails', async () => {
      arrangeDb({
        ...baseDb,
        connections: {
          10: [
            { id: 1, trip_attraction_id_from: 100, trip_attraction_id_to: 101 },
          ],
        },
      });
      vi.mocked(imageRepo.getConnectionImagesBatch).mockResolvedValue(
        new Map([[1, [{ id: 10, filename: 'conn-1.jpg', title: '' }]]]),
      );
      mockConnCommit.mockRejectedValueOnce(new Error('commit failed'));

      await expect(moveToDay(1, 100, 20, 0)).rejects.toThrow('commit failed');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });
  });
});
