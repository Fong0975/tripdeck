import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyImageFile } from '../middleware/upload';
import type { UpdateAttractionBody } from '../types/trip';

import {
  create,
  deleteById,
  duplicate,
  getDayIdForAttraction,
  update,
  updateOrder,
  verifyBelongsToTrip,
} from './attractionRepository';
import * as imageRepo from './imageRepository';

const mockPoolExecute = vi.fn();
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

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

const mockConnectionDeleteById = vi.fn().mockResolvedValue(true);
vi.mock('./connectionRepository', () => ({
  deleteById: (...args: unknown[]) => mockConnectionDeleteById(...args),
}));

vi.mock('./imageRepository', () => ({
  getAttractionImages: vi.fn().mockResolvedValue([]),
  addAttractionImage: vi.fn(),
}));

vi.mock('../middleware/upload', () => ({
  deleteImageFromDisk: vi.fn(),
  copyImageFile: vi.fn(),
}));

describe('attractionRepository', () => {
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
    mockConnectionDeleteById.mockResolvedValue(true);
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

      await updateOrder(10, orderedIds);

      expect(mockConnQuery).toHaveBeenCalledWith(
        'DELETE FROM trip_connections WHERE id IN (?)',
        [[2, 3]],
      );
      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
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
    });
  });

  describe('deleteById', () => {
    it('deletes every trip_connections row referencing the attraction before deleting it', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 1 }, { id: 2 }]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await deleteById(100);

      expect(mockConnectionDeleteById).toHaveBeenNthCalledWith(1, 1);
      expect(mockConnectionDeleteById).toHaveBeenNthCalledWith(2, 2);
      expect(result).toBe(true);
    });

    it('returns false and does not delete any connection when the attraction does not exist', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([{ affectedRows: 0 }]);
      });

      const result = await deleteById(999);

      expect(mockConnectionDeleteById).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('getDayIdForAttraction', () => {
    it.each([
      {
        description: 'rows found',
        rows: [{ trip_day_id: 42 }],
        expectThrow: false,
      },
      { description: 'rows empty', rows: [], expectThrow: true },
    ])('$description', async ({ rows, expectThrow }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      if (expectThrow) {
        await expect(getDayIdForAttraction(1)).rejects.toThrow(
          'Attraction not found',
        );
      } else {
        await expect(getDayIdForAttraction(1)).resolves.toBe(42);
      }
    });
  });

  describe('verifyBelongsToTrip', () => {
    it.each([
      { description: 'rows.length > 0', rows: [{ id: 1 }], expected: true },
      { description: 'rows.length === 0', rows: [], expected: false },
    ])('$description', async ({ rows, expected }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      await expect(verifyBelongsToTrip(1, 2)).resolves.toBe(expected);
    });
  });

  describe('create', () => {
    it('computes sortOrder from the count of existing attractions in the day', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ count: 3 }]]);
        }
        if (sql.trim().startsWith('INSERT INTO trip_attractions')) {
          return Promise.resolve([{ insertId: 55 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await create(10, { name: 'Museum' });

      expect(result.sortOrder).toBe(3);
      expect(mockConnCommit).toHaveBeenCalled();
    });

    it('defaults googleMapUrl, notes, nearbyAttractions, startTime, and endTime to null when omitted', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ count: 0 }]]);
        }
        if (sql.trim().startsWith('INSERT INTO trip_attractions')) {
          return Promise.resolve([{ insertId: 1 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await create(10, { name: 'Museum' });

      expect(mockConnExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trip_attractions'),
        [10, 'Museum', null, null, null, null, null, 0],
      );
      expect(result).toEqual({
        id: 1,
        name: 'Museum',
        googleMapUrl: null,
        notes: null,
        nearbyAttractions: null,
        startTime: null,
        endTime: null,
        referenceWebsites: [],
        images: [],
        sortOrder: 0,
      });
    });

    it('inserts a row for each provided reference website', async () => {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ count: 0 }]]);
        }
        if (sql.trim().startsWith('INSERT INTO trip_attractions')) {
          return Promise.resolve([{ insertId: 1 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const websites = [
        { url: 'https://a.com', title: 'A' },
        { url: 'https://b.com', title: 'B' },
      ];

      const result = await create(10, {
        name: 'Museum',
        referenceWebsites: websites,
      });

      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [1, 'https://a.com', 'A'],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [1, 'https://b.com', 'B'],
      );
      expect(result.referenceWebsites).toEqual(websites);
    });

    it('rolls back the transaction and rethrows when a query fails', async () => {
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(create(10, { name: 'Museum' })).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const currentRow = {
      id: 5,
      trip_day_id: 10,
      name: 'Old Name',
      google_map_url: 'https://old.com',
      notes: 'old notes',
      nearby_attractions: 'old nearby',
      start_time: '09:00',
      end_time: '10:00',
      sort_order: 2,
    };

    function mockSelectSequence(
      current: typeof currentRow,
      updated: typeof currentRow,
      websiteRows: unknown[] = [],
    ) {
      let selectCount = 0;
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM trip_attractions')) {
          selectCount++;
          return Promise.resolve([[selectCount === 1 ? current : updated]]);
        }
        if (sql.includes('trip_attraction_websites')) {
          return Promise.resolve([websiteRows]);
        }
        return Promise.resolve([[]]);
      });
    }

    function buildUpdateData(
      field: string,
      value: unknown,
    ): UpdateAttractionBody {
      return { name: 'New Name', [field]: value } as UpdateAttractionBody;
    }

    it('returns null and does not start a transaction when the attraction does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await update(999, { name: 'New' });

      expect(result).toBeNull();
      expect(mockGetConnection).not.toHaveBeenCalled();
    });

    describe('per-field fallback semantics', () => {
      it.each([
        {
          field: 'googleMapUrl',
          paramIndex: 1,
          curValue: currentRow.google_map_url,
        },
        { field: 'notes', paramIndex: 2, curValue: currentRow.notes },
        { field: 'startTime', paramIndex: 4, curValue: currentRow.start_time },
      ])(
        'keeps the current value for $field when it is omitted from data',
        async ({ paramIndex, curValue }) => {
          mockSelectSequence(currentRow, currentRow);
          mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);

          await update(currentRow.id, { name: 'New Name' });

          const updateCall = mockConnExecute.mock.calls.find(([sql]) =>
            sql.includes('UPDATE trip_attractions'),
          );
          expect(updateCall?.[1][paramIndex]).toBe(curValue);
        },
      );

      it.each([
        { field: 'googleMapUrl', paramIndex: 1, newValue: 'https://new.com' },
        { field: 'notes', paramIndex: 2, newValue: 'new notes' },
        { field: 'startTime', paramIndex: 4, newValue: '11:00' },
      ])(
        'uses the new value for $field when it is provided in data',
        async ({ field, paramIndex, newValue }) => {
          mockSelectSequence(currentRow, currentRow);
          mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);

          await update(currentRow.id, buildUpdateData(field, newValue));

          const updateCall = mockConnExecute.mock.calls.find(([sql]) =>
            sql.includes('UPDATE trip_attractions'),
          );
          expect(updateCall?.[1][paramIndex]).toBe(newValue);
        },
      );
    });

    it('replaces reference websites when referenceWebsites is provided as an array', async () => {
      mockSelectSequence(currentRow, currentRow);
      mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await update(currentRow.id, {
        referenceWebsites: [{ url: 'https://a.com', title: 'A' }],
      });

      expect(mockConnExecute).toHaveBeenCalledWith(
        'DELETE FROM trip_attraction_websites WHERE trip_attraction_id = ?',
        [currentRow.id],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [currentRow.id, 'https://a.com', 'A'],
      );
    });

    it('does not issue a DELETE for reference websites when referenceWebsites is omitted', async () => {
      mockSelectSequence(currentRow, currentRow);
      mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await update(currentRow.id, { name: 'New Name' });

      expect(mockConnExecute).not.toHaveBeenCalledWith(
        'DELETE FROM trip_attraction_websites WHERE trip_attraction_id = ?',
        expect.anything(),
      );
    });

    it('commits the transaction on success', async () => {
      mockSelectSequence(currentRow, currentRow);
      mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await update(currentRow.id, { name: 'New Name' });

      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
    });

    it('rolls back the transaction and rethrows when a query fails', async () => {
      mockPoolExecute.mockResolvedValueOnce([[currentRow]]);
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(update(currentRow.id, { name: 'New Name' })).rejects.toThrow(
        'db error',
      );

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });

    it('returns the updated attraction reflecting the re-selected row, websites, and images', async () => {
      const updatedRow = {
        ...currentRow,
        name: 'New Name',
        google_map_url: 'https://new.com',
      };
      const websiteRows = [
        {
          id: 1,
          trip_attraction_id: currentRow.id,
          url: 'https://a.com',
          title: 'A',
        },
      ];
      const images = [{ id: 1, filename: 'abc.jpg', title: 'Photo' }];

      mockSelectSequence(currentRow, updatedRow, websiteRows);
      mockConnExecute.mockResolvedValue([{ affectedRows: 1 }]);
      vi.mocked(imageRepo.getAttractionImages).mockResolvedValueOnce(images);

      const result = await update(currentRow.id, {
        name: 'New Name',
        googleMapUrl: 'https://new.com',
      });

      expect(result).toEqual({
        id: updatedRow.id,
        name: 'New Name',
        googleMapUrl: 'https://new.com',
        notes: updatedRow.notes,
        nearbyAttractions: updatedRow.nearby_attractions,
        startTime: updatedRow.start_time,
        endTime: updatedRow.end_time,
        referenceWebsites: [{ url: 'https://a.com', title: 'A' }],
        images,
        sortOrder: updatedRow.sort_order,
      });
    });
  });

  describe('duplicate', () => {
    const originalRow = {
      id: 5,
      trip_day_id: 3,
      name: 'Museum',
      google_map_url: 'https://old.com',
      notes: 'notes',
      nearby_attractions: 'nearby',
      start_time: '09:00',
      end_time: '10:00',
      sort_order: 1,
    };

    it('throws when the source attraction does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      await expect(duplicate(999, 10)).rejects.toThrow('Attraction not found');
      expect(mockGetConnection).not.toHaveBeenCalled();
    });

    it('duplicates the attraction with sortOrder from the count query, copied fields, and re-inserted reference websites', async () => {
      const websiteRows = [
        {
          id: 1,
          trip_attraction_id: originalRow.id,
          url: 'https://a.com',
          title: 'A',
        },
      ];
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM trip_attractions')) {
          return Promise.resolve([[originalRow]]);
        }
        if (sql.includes('trip_attraction_websites')) {
          return Promise.resolve([websiteRows]);
        }
        return Promise.resolve([[]]);
      });
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ count: 4 }]]);
        }
        if (sql.trim().startsWith('INSERT INTO trip_attractions')) {
          return Promise.resolve([{ insertId: 99 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await duplicate(originalRow.id, 10);

      expect(result.sortOrder).toBe(4);
      expect(mockConnExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trip_attractions'),
        [
          10,
          'Museum',
          'https://old.com',
          'notes',
          'nearby',
          '09:00',
          '10:00',
          4,
        ],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [99, 'https://a.com', 'A'],
      );
      expect(result.referenceWebsites).toEqual([
        { url: 'https://a.com', title: 'A' },
      ]);
      expect(mockConnCommit).toHaveBeenCalled();
    });

    it('rolls back the transaction and rethrows when a query fails', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM trip_attractions')) {
          return Promise.resolve([[originalRow]]);
        }
        return Promise.resolve([[]]);
      });
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(duplicate(originalRow.id, 10)).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: 'copyImageFile returns a new filename',
        copiedFilename: 'new1.jpg',
      },
      {
        description:
          'copyImageFile returns null because the source file is missing',
        copiedFilename: null,
      },
    ])('$description', async ({ copiedFilename }) => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM trip_attractions')) {
          return Promise.resolve([[originalRow]]);
        }
        return Promise.resolve([[]]);
      });
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve([[{ count: 0 }]]);
        }
        if (sql.trim().startsWith('INSERT INTO trip_attractions')) {
          return Promise.resolve([{ insertId: 99 }]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
      vi.mocked(imageRepo.getAttractionImages).mockResolvedValueOnce([
        { id: 1, filename: 'old1.jpg', title: 'Photo1' },
      ]);
      vi.mocked(copyImageFile).mockReturnValueOnce(copiedFilename);
      vi.mocked(imageRepo.addAttractionImage).mockResolvedValueOnce({
        id: 2,
        filename: copiedFilename ?? '',
        title: 'Photo1',
      });

      const result = await duplicate(originalRow.id, 10);

      if (copiedFilename) {
        expect(imageRepo.addAttractionImage).toHaveBeenCalledWith(
          99,
          copiedFilename,
          'Photo1',
        );
        expect(result.images).toEqual([
          { id: 2, filename: copiedFilename, title: 'Photo1' },
        ]);
      } else {
        expect(imageRepo.addAttractionImage).not.toHaveBeenCalled();
        expect(result.images).toEqual([]);
      }
    });
  });
});
