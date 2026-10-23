import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../test-utils/dbMocks';

import {
  create,
  deleteById,
  update,
  verifyBelongsToTrip,
} from './connectionRepository';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

const mockGetConnectionImages = vi.fn().mockResolvedValue([]);
vi.mock('./imageRepository', () => ({
  getConnectionImages: (...args: unknown[]) => mockGetConnectionImages(...args),
}));

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

const CURRENT_ROW = {
  id: 1,
  trip_day_id: 5,
  trip_attraction_id_from: 100,
  trip_attraction_id_to: 101,
  transport_mode: 'walk',
  duration: '10 min',
  route: 'main street',
  notes: 'old notes',
};

describe('connectionRepository', () => {
  beforeEach(() => {
    mockGetConnectionImages.mockResolvedValue([]);
  });

  describe('verifyBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);
        const result = await verifyBelongsToTrip(1, 10);
        expect(result).toBe(expected);
      },
    );
  });

  describe('create', () => {
    it('inserts a connection and defaults optional fields to null when omitted', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 7 }]);

      const result = await create(5, {
        fromAttractionId: 100,
        toAttractionId: 101,
        transportMode: 'walk',
      });

      expect(result).toEqual({
        id: 7,
        fromAttractionId: 100,
        toAttractionId: 101,
        transportMode: 'walk',
        duration: null,
        route: null,
        notes: null,
        images: [],
      });
    });

    it('carries through duration/route/notes when provided', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 8 }]);

      const result = await create(5, {
        fromAttractionId: 100,
        toAttractionId: 101,
        transportMode: 'transit',
        duration: '20 min',
        route: 'JR line',
        notes: 'buy ticket in advance',
      });

      expect(result).toMatchObject({
        duration: '20 min',
        route: 'JR line',
        notes: 'buy ticket in advance',
      });
    });
  });

  describe('update', () => {
    function mockSelectThenUpdate(updatedRow = CURRENT_ROW) {
      routeSql(
        mockPoolExecute,
        [[sql => sql.trim().startsWith('SELECT'), [[updatedRow]]]],
        [{ affectedRows: 1 }],
      );
    }

    it('returns null when the connection does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await update(999, { transportMode: 'walk' });

      expect(result).toBeNull();
    });

    function findUpdateParams() {
      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      return updateCall?.[1];
    }

    it('falls back to the current value for every field omitted from data', async () => {
      mockSelectThenUpdate();

      await update(1, {});

      expect(findUpdateParams()).toEqual([
        CURRENT_ROW.trip_attraction_id_from,
        CURRENT_ROW.trip_attraction_id_to,
        CURRENT_ROW.transport_mode,
        CURRENT_ROW.duration,
        CURRENT_ROW.route,
        CURRENT_ROW.notes,
        1,
      ]);
    });

    it('clears duration when it is explicitly set to null', async () => {
      mockSelectThenUpdate();

      await update(1, { duration: null });

      expect(findUpdateParams()?.[3]).toBeNull();
    });

    it('overrides provided fields and returns the updated connection with images attached', async () => {
      mockSelectThenUpdate();
      mockGetConnectionImages.mockResolvedValue([
        { id: 1, filename: 'a.jpg', title: 'A' },
      ]);

      const result = await update(1, {
        fromAttractionId: 200,
        toAttractionId: 201,
        transportMode: 'car',
        duration: '30 min',
      });

      expect(findUpdateParams()).toEqual([
        200,
        201,
        'car',
        '30 min',
        CURRENT_ROW.route,
        CURRENT_ROW.notes,
        1,
      ]);
      expect(result).toMatchObject({
        id: 1,
        images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
      });
    });
  });

  describe('deleteById', () => {
    it('deletes every image on disk when the connection is deleted', async () => {
      mockGetConnectionImages.mockResolvedValue([
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ]);
      mockPoolExecute.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await deleteById(1);

      expect(result).toBe(true);
      expect(mockDeleteImageFromDisk).toHaveBeenNthCalledWith(1, 'a.jpg');
      expect(mockDeleteImageFromDisk).toHaveBeenNthCalledWith(2, 'b.jpg');
    });

    it('does not touch disk when the connection does not exist', async () => {
      mockGetConnectionImages.mockResolvedValue([
        { id: 1, filename: 'a.jpg', title: 'A' },
      ]);
      mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await deleteById(999);

      expect(result).toBe(false);
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });
  });
});
