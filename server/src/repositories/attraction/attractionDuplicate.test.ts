import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyImageFile } from '../../middleware/upload';
import * as imageRepo from '../imageRepository';

import { duplicate } from './attractionDuplicate';

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

vi.mock('../imageRepository', () => ({
  getAttractionImages: vi.fn().mockResolvedValue([]),
  addAttractionImage: vi.fn(),
}));

vi.mock('../../middleware/upload', () => ({
  deleteImageFromDisk: vi.fn(),
  copyImageFile: vi.fn(),
}));

describe('attractionDuplicate', () => {
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
