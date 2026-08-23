import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  create,
  deleteById,
  update,
  verifyBelongsToTrip,
} from './connectionRepository';

const mockPoolExecute = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

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
    vi.clearAllMocks();
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
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[updatedRow]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the connection does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await update(999, { transportMode: 'walk' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'fromAttractionId omitted falls back to the current value',
        data: {},
        expectedParam: CURRENT_ROW.trip_attraction_id_from,
        paramIndex: 0,
      },
      {
        name: 'fromAttractionId provided overrides the current value',
        data: { fromAttractionId: 200 },
        expectedParam: 200,
        paramIndex: 0,
      },
      {
        name: 'toAttractionId omitted falls back to the current value',
        data: {},
        expectedParam: CURRENT_ROW.trip_attraction_id_to,
        paramIndex: 1,
      },
      {
        name: 'transportMode omitted falls back to the current value',
        data: {},
        expectedParam: CURRENT_ROW.transport_mode,
        paramIndex: 2,
      },
      {
        name: 'transportMode provided overrides the current value',
        data: { transportMode: 'car' },
        expectedParam: 'car',
        paramIndex: 2,
      },
    ])('$name', async ({ data, expectedParam, paramIndex }) => {
      mockSelectThenUpdate();

      await update(1, data);

      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      expect(updateCall?.[1][paramIndex]).toBe(expectedParam);
    });

    it.each([
      {
        name: 'duration omitted falls back to the current value',
        data: {},
        expectedParam: CURRENT_ROW.duration,
      },
      {
        name: 'duration explicitly set to null clears the value',
        data: { duration: null },
        expectedParam: null,
      },
      {
        name: 'duration provided overrides the current value',
        data: { duration: '30 min' },
        expectedParam: '30 min',
      },
    ])('$name', async ({ data, expectedParam }) => {
      mockSelectThenUpdate();

      await update(1, data);

      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      expect(updateCall?.[1][3]).toBe(expectedParam);
    });

    it('returns the updated connection with images attached', async () => {
      mockSelectThenUpdate();
      mockGetConnectionImages.mockResolvedValue([
        { id: 1, filename: 'a.jpg', title: 'A' },
      ]);

      const result = await update(1, { transportMode: 'car' });

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
