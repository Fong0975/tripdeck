import { describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../test-utils/dbMocks';
import { mockLogger } from '../test-utils/loggerMock';

import {
  addAttractionImage,
  addConnectionImage,
  addDayImage,
  addTripImage,
  deleteAttractionImage,
  deleteConnectionImage,
  deleteDayImage,
  deleteTripImage,
  getAttractionImages,
  getAttractionImagesBatch,
  getConnectionImages,
  getConnectionImagesBatch,
  getDayImages,
  getDayImagesBatch,
  getTripImages,
  getTripImagesBatch,
} from './imageRepository';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

interface Variant {
  kind: 'attraction' | 'connection' | 'trip' | 'day';
  table: string;
  idColumn:
    | 'trip_attraction_id'
    | 'trip_connection_id'
    | 'trip_id'
    | 'trip_day_id';
  getImages: typeof getAttractionImages;
  getImagesBatch: typeof getAttractionImagesBatch;
  addImage: typeof addAttractionImage;
  deleteImage: typeof deleteAttractionImage;
}

const variants: Variant[] = [
  {
    kind: 'attraction',
    table: 'trip_attraction_images',
    idColumn: 'trip_attraction_id',
    getImages: getAttractionImages,
    getImagesBatch: getAttractionImagesBatch,
    addImage: addAttractionImage,
    deleteImage: deleteAttractionImage,
  },
  {
    kind: 'connection',
    table: 'trip_connection_images',
    idColumn: 'trip_connection_id',
    getImages: getConnectionImages,
    getImagesBatch: getConnectionImagesBatch,
    addImage: addConnectionImage,
    deleteImage: deleteConnectionImage,
  },
  {
    kind: 'trip',
    table: 'trip_images',
    idColumn: 'trip_id',
    getImages: getTripImages,
    getImagesBatch: getTripImagesBatch,
    addImage: addTripImage,
    deleteImage: deleteTripImage,
  },
  {
    kind: 'day',
    table: 'trip_day_images',
    idColumn: 'trip_day_id',
    getImages: getDayImages,
    getImagesBatch: getDayImagesBatch,
    addImage: addDayImage,
    deleteImage: deleteDayImage,
  },
];

describe('image repositories', () => {
  describe.each(variants)(
    '$kind images wiring',
    ({ table, idColumn, getImages, getImagesBatch, addImage, deleteImage }) => {
      it('targets its own table and parent column in every query', async () => {
        mockPoolExecute.mockResolvedValue([[{ id: 1, filename: 'a.jpg' }]]);

        await getImages(10);
        await getImagesBatch([10]);
        await deleteImage(1, 10);
        mockPoolExecute.mockResolvedValue([{ insertId: 1 }]);
        await addImage(10, 'a.jpg', 'A');

        const sqls = mockPoolExecute.mock.calls.map(([sql]) => sql as string);
        const selects = sqls.filter(sql => sql.startsWith('SELECT'));
        expect(selects).toHaveLength(3);
        selects.forEach(sql => {
          expect(sql).toContain(`FROM ${table}`);
          expect(sql).toContain(idColumn);
        });
        expect(sqls).toContain(`DELETE FROM ${table} WHERE id = ?`);
        expect(sqls).toContain(
          `INSERT INTO ${table} (${idColumn}, filename, title) VALUES (?, ?, ?)`,
        );
      });
    },
  );

  const { idColumn, getImages, getImagesBatch, addImage, deleteImage } =
    variants[0];

  describe('getImages', () => {
    it('maps rows to ImageResponse[]', async () => {
      mockPoolExecute.mockResolvedValue([
        [
          { id: 1, filename: 'a.jpg', title: 'A', [idColumn]: 10 },
          { id: 2, filename: 'b.jpg', title: 'B', [idColumn]: 10 },
        ],
      ]);

      const result = await getImages(10);

      expect(result).toEqual([
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ]);
      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining(idColumn),
        [10],
      );
    });
  });

  describe('getImagesBatch', () => {
    it('returns an empty map without querying when given an empty array', async () => {
      const result = await getImagesBatch([]);

      expect(result).toEqual(new Map());
      expect(mockPoolExecute).not.toHaveBeenCalled();
    });

    it('groups rows by parent id', async () => {
      mockPoolExecute.mockResolvedValue([
        [
          { id: 1, filename: 'a.jpg', title: 'A', [idColumn]: 10 },
          { id: 2, filename: 'b.jpg', title: 'B', [idColumn]: 10 },
          { id: 3, filename: 'c.jpg', title: 'C', [idColumn]: 20 },
        ],
      ]);

      const result = await getImagesBatch([10, 20]);

      expect(result.get(10)).toEqual([
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ]);
      expect(result.get(20)).toEqual([
        { id: 3, filename: 'c.jpg', title: 'C' },
      ]);
    });
  });

  describe('addImage', () => {
    it('inserts a row and returns the created image', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 42 }]);

      const result = await addImage(10, 'new.jpg', 'New');

      expect(result).toEqual({ id: 42, filename: 'new.jpg', title: 'New' });
      expect(mockPoolExecute).toHaveBeenCalledWith(expect.any(String), [
        10,
        'new.jpg',
        'New',
      ]);
    });

    it('logs and rethrows when the insert fails', async () => {
      const error = new Error('insert failed');
      mockPoolExecute.mockRejectedValue(error);

      await expect(addImage(10, 'new.jpg', 'New')).rejects.toThrow(
        'insert failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to insert image row after file was written to disk',
        expect.objectContaining({ parentId: 10, filename: 'new.jpg' }),
        error,
      );
    });
  });

  describe('deleteImage', () => {
    it('returns false and does not touch disk when the image is not found', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await deleteImage(999, 10);

      expect(result).toBe(false);
      expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
    });

    it('deletes the row and the file on disk when found', async () => {
      routeSql(
        mockPoolExecute,
        [
          [
            sql => sql.trim().startsWith('SELECT'),
            [[{ id: 1, filename: 'a.jpg' }]],
          ],
        ],
        [{ affectedRows: 1 }],
      );

      const result = await deleteImage(1, 10);

      expect(result).toBe(true);
      expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('a.jpg');
    });
  });
});
