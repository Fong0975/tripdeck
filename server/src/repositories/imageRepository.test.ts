import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addAttractionImage,
  addConnectionImage,
  deleteAttractionImage,
  deleteConnectionImage,
  getAttractionImages,
  getAttractionImagesBatch,
  getConnectionImages,
  getConnectionImagesBatch,
} from './imageRepository';

const mockPoolExecute = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

const mockDeleteImageFromDisk = vi.fn();
vi.mock('../middleware/upload', () => ({
  deleteImageFromDisk: (...args: unknown[]) => mockDeleteImageFromDisk(...args),
}));

interface Variant {
  kind: 'attraction' | 'connection';
  idColumn: 'trip_attraction_id' | 'trip_connection_id';
  getImages: typeof getAttractionImages;
  getImagesBatch: typeof getAttractionImagesBatch;
  addImage: typeof addAttractionImage;
  deleteImage: typeof deleteAttractionImage;
}

const variants: Variant[] = [
  {
    kind: 'attraction',
    idColumn: 'trip_attraction_id',
    getImages: getAttractionImages,
    getImagesBatch: getAttractionImagesBatch,
    addImage: addAttractionImage,
    deleteImage: deleteAttractionImage,
  },
  {
    kind: 'connection',
    idColumn: 'trip_connection_id',
    getImages: getConnectionImages,
    getImagesBatch: getConnectionImagesBatch,
    addImage: addConnectionImage,
    deleteImage: deleteConnectionImage,
  },
];

describe.each(variants)(
  '$kind images',
  ({ idColumn, getImages, getImagesBatch, addImage, deleteImage }) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

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
    });

    describe('deleteImage', () => {
      it('returns false and does not touch disk when the image is not found', async () => {
        mockPoolExecute.mockResolvedValue([[]]);

        const result = await deleteImage(999, 10);

        expect(result).toBe(false);
        expect(mockDeleteImageFromDisk).not.toHaveBeenCalled();
      });

      it('deletes the row and the file on disk when found', async () => {
        mockPoolExecute.mockImplementation((sql: string) => {
          if (sql.trim().startsWith('SELECT')) {
            return Promise.resolve([[{ id: 1, filename: 'a.jpg' }]]);
          }
          return Promise.resolve([{ affectedRows: 1 }]);
        });

        const result = await deleteImage(1, 10);

        expect(result).toBe(true);
        expect(mockDeleteImageFromDisk).toHaveBeenCalledWith('a.jpg');
      });
    });
  },
);
