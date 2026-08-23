import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as imageRepo from '../imageRepository';

import { updateOrder } from './attractionOrder';

const mockConnBeginTransaction = vi.fn();
const mockConnExecute = vi.fn();
const mockConnQuery = vi.fn();
const mockConnCommit = vi.fn();
const mockConnRollback = vi.fn();
const mockConnRelease = vi.fn();
const mockGetConnection = vi.fn().mockResolvedValue({
  beginTransaction: mockConnBeginTransaction,
  execute: mockConnExecute,
  query: mockConnQuery,
  commit: mockConnCommit,
  rollback: mockConnRollback,
  release: mockConnRelease,
});

vi.mock('../../config/database', () => ({
  default: {
    getConnection: () => mockGetConnection(),
  },
}));

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

vi.mock('../imageRepository', () => ({
  getConnectionImagesBatch: vi.fn(),
}));

describe('attractionOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnection.mockResolvedValue({
      beginTransaction: mockConnBeginTransaction,
      execute: mockConnExecute,
      query: mockConnQuery,
      commit: mockConnCommit,
      rollback: mockConnRollback,
      release: mockConnRelease,
    });
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

      expect(mockConnQuery).not.toHaveBeenCalled();
      expect(mockConnCommit).toHaveBeenCalled();
      expect(imageRepo.getConnectionImagesBatch).not.toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });

    it('scopes the connection lookup to the given day', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      await updateOrder(42, [100, 101]);

      expect(mockConnExecute).toHaveBeenCalledWith(
        expect.stringContaining('trip_connections'),
        [42],
      );
    });

    it('does nothing when orderedIds is empty', async () => {
      await updateOrder(10, []);

      expect(mockGetConnection).not.toHaveBeenCalled();
    });

    it('rolls back the transaction and rethrows when a query fails', async () => {
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(updateOrder(10, [100, 101])).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
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
