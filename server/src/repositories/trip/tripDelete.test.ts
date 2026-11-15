import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../connection');

import { db } from '../../test-utils/dbMocks';
import { mockLogger } from '../../test-utils/loggerMock';
import * as connectionRepo from '../connection';

import { deleteById } from './tripDelete';

const mockGetTripImages = vi.fn().mockResolvedValue([]);
const mockGetDayImagesBatch = vi.fn().mockResolvedValue(new Map());
const mockGetAttractionImagesBatch = vi.fn().mockResolvedValue(new Map());
vi.mock('../image', () => ({
  getTripImages: (...args: unknown[]) => mockGetTripImages(...args),
  getDayImagesBatch: (...args: unknown[]) => mockGetDayImagesBatch(...args),
  getAttractionImagesBatch: (...args: unknown[]) =>
    mockGetAttractionImagesBatch(...args),
}));

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../../storage/imageFiles', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockPoolExecute = db.pool.execute;

describe('tripDelete', () => {
  describe('deleteById', () => {
    /**
     * Queues the three lookup queries deleteById always issues before the
     * final `DELETE FROM trips` (day ids, attraction ids, connection ids, in
     * that order), then the delete's own result.
     */
    function queueDeleteLookups({
      dayRows = [],
      attractionRows = [],
      connectionRows = [],
      affectedRows,
    }: {
      dayRows?: { id: number }[];
      attractionRows?: { id: number }[];
      connectionRows?: { id: number }[];
      affectedRows: number;
    }) {
      mockPoolExecute
        .mockResolvedValueOnce([dayRows]) // trip_days lookup
        .mockResolvedValueOnce([attractionRows]) // trip_attractions lookup
        .mockResolvedValueOnce([connectionRows]) // trip_connections lookup
        .mockResolvedValueOnce([{ affectedRows }]);
    }

    beforeEach(() => {
      mockGetTripImages.mockResolvedValue([]);
      mockGetDayImagesBatch.mockResolvedValue(new Map());
      mockGetAttractionImagesBatch.mockResolvedValue(new Map());
      vi.mocked(connectionRepo.deleteById).mockResolvedValue(true);
    });

    it('returns false when no trip row was deleted', async () => {
      queueDeleteLookups({ affectedRows: 0 });

      const result = await deleteById(5);

      expect(result).toBe(false);
      expect(mockPoolExecute).toHaveBeenCalledWith(
        'DELETE FROM trips WHERE id = ?',
        [5],
      );
    });

    it('unlinks trip, day and attraction images in that order once the trip is deleted', async () => {
      mockGetTripImages.mockResolvedValueOnce([
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ]);
      queueDeleteLookups({
        dayRows: [{ id: 401 }, { id: 402 }],
        attractionRows: [{ id: 9001 }, { id: 9002 }],
        affectedRows: 1,
      });
      mockGetDayImagesBatch.mockResolvedValueOnce(
        new Map([[401, [{ id: 3, filename: 'day401.jpg', title: '' }]]]),
      );
      mockGetAttractionImagesBatch.mockResolvedValueOnce(
        new Map([[9001, [{ id: 4, filename: 'attr9001.jpg', title: '' }]]]),
      );

      const result = await deleteById(5);

      expect(result).toBe(true);
      expect(mockGetTripImages).toHaveBeenCalledWith(5);
      expect(mockGetDayImagesBatch).toHaveBeenCalledWith([401, 402]);
      expect(mockGetAttractionImagesBatch).toHaveBeenCalledWith([9001, 9002]);
      expect(connectionRepo.deleteById).not.toHaveBeenCalled();
      expect(mockDeleteImageFromDisk.mock.calls).toEqual([
        ['a.jpg'],
        ['b.jpg'],
        ['day401.jpg'],
        ['attr9001.jpg'],
      ]);
      expect(mockLogger.debug).toHaveBeenCalledWith('Trip deleted', {
        tripId: 5,
        connectionsDeleted: 0,
        imagesDeleted: 4,
      });
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('does not touch disk when the trip does not exist', async () => {
      mockGetTripImages.mockResolvedValueOnce([
        { id: 1, filename: 'a.jpg', title: 'A' },
      ]);
      mockGetDayImagesBatch.mockResolvedValueOnce(
        new Map([[401, [{ id: 2, filename: 'day401.jpg', title: '' }]]]),
      );
      queueDeleteLookups({ dayRows: [{ id: 401 }], affectedRows: 0 });

      const result = await deleteById(999);

      expect(result).toBe(false);
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('deletes every trip_connections row under the trip before deleting the trip itself', async () => {
      queueDeleteLookups({
        connectionRows: [{ id: 701 }, { id: 702 }],
        affectedRows: 1,
      });

      const result = await deleteById(5);

      expect(result).toBe(true);
      expect(mockPoolExecute).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('SELECT tc.id FROM trip_connections tc'),
        [5],
      );
      expect(vi.mocked(connectionRepo.deleteById).mock.calls).toEqual([
        [701],
        [702],
      ]);
      const connectionDeleteOrder = vi.mocked(connectionRepo.deleteById).mock
        .invocationCallOrder[0];
      const tripDeleteCallIndex = mockPoolExecute.mock.calls.findIndex(
        ([sql]) => (sql as string) === 'DELETE FROM trips WHERE id = ?',
      );
      const tripDeleteOrder =
        mockPoolExecute.mock.invocationCallOrder[tripDeleteCallIndex];
      expect(connectionDeleteOrder).toBeLessThan(tripDeleteOrder);
    });
  });
});
