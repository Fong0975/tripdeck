import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../test-utils/dbMocks';
import * as imageRepo from '../imageRepository';

import { updateOrder } from './attractionOrder';

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
});
