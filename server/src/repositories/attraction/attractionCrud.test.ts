import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateAttractionBody } from '../../types/trip';
import * as imageRepo from '../imageRepository';

import {
  create,
  deleteById,
  getDayIdForAttraction,
  update,
  verifyBelongsToTrip,
} from './attractionCrud';

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

vi.mock('../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

const mockConnectionDeleteById = vi.fn().mockResolvedValue(true);
vi.mock('../connectionRepository', () => ({
  deleteById: (...args: unknown[]) => mockConnectionDeleteById(...args),
}));

vi.mock('../imageRepository', () => ({
  getAttractionImages: vi.fn().mockResolvedValue([]),
  addAttractionImage: vi.fn(),
}));

vi.mock('../../middleware/upload', () => ({
  deleteImageFromDisk: vi.fn(),
  copyImageFile: vi.fn(),
}));

describe('attractionCrud', () => {
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
});
