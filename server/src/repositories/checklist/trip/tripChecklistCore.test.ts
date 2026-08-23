import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findChecklist,
  findOrInitChecklist,
  initChecklist,
} from './tripChecklistCore';

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

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
    getConnection: () => mockGetConnection(),
  },
}));

describe('tripChecklistCore', () => {
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

  describe('findChecklist', () => {
    it('returns null and issues no further queries when there are no occasions', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await findChecklist(1);

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('returns an empty categories array when occasions exist but no categories do', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([[{ id: 1, trip_id: 5, name: '收拾' }]]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([[]]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findChecklist(5);

      expect(result).toEqual({
        tripId: 5,
        categories: [],
        occasions: [{ id: 1, name: '收拾', checks: {} }],
      });
    });

    it('aggregates categories with items and specs, and builds a sparse checks map containing only checked=1 entries', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([
            [
              { id: 1, trip_id: 5, name: '收拾' },
              { id: 2, trip_id: 5, name: '出發前' },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([[{ id: 10, trip_id: 5, name: '衣物' }]]);
        }
        if (sql.includes('checklist_trip_item_specs')) {
          return Promise.resolve([
            [
              {
                id: 1000,
                checklist_trip_item_id: 100,
                name: '防水',
                storage_location: '登山包',
              },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_items')) {
          return Promise.resolve([
            [
              {
                id: 100,
                checklist_trip_category_id: 10,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
              },
              {
                id: 101,
                checklist_trip_category_id: 10,
                name: '襪子',
                quantity: 3,
                notes: null,
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([
            [{ checklist_occasion_id: 1, checklist_trip_item_id: 100 }],
          ]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findChecklist(5);

      expect(result).toEqual({
        tripId: 5,
        categories: [
          {
            id: 10,
            name: '衣物',
            items: [
              {
                id: 100,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
                specs: [{ id: 1000, name: '防水', storage_location: '登山包' }],
              },
              {
                id: 101,
                name: '襪子',
                quantity: 3,
                notes: null,
                storage_location: null,
                specs: [],
              },
            ],
          },
        ],
        occasions: [
          { id: 1, name: '收拾', checks: { 100: true } },
          { id: 2, name: '出發前', checks: {} },
        ],
      });
      expect(result?.occasions[0].checks).not.toHaveProperty('101');
    });
  });

  describe('initChecklist', () => {
    const tripId = 5;

    function mockTransactionCopyFlow() {
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_template_categories')) {
          return Promise.resolve([[{ id: 1, name: '衣物' }]]);
        }
        if (sql.includes('checklist_template_item_specs')) {
          return Promise.resolve([
            [
              {
                id: 111,
                checklist_template_item_id: 11,
                name: '防水',
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_template_items')) {
          return Promise.resolve([
            [
              {
                id: 11,
                checklist_template_category_id: 1,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([{ insertId: 500 }]);
        }
        if (sql.includes('checklist_trip_item_specs')) {
          return Promise.resolve([{ insertId: 700 }]);
        }
        if (sql.includes('checklist_trip_items')) {
          return Promise.resolve([{ insertId: 600 }]);
        }
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([{ insertId: 900 }]);
        }
        return Promise.resolve([[]]);
      });
    }

    function mockFindChecklistAfterInit() {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([
            [{ id: 900, trip_id: tripId, name: '收拾' }],
          ]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([
            [{ id: 500, trip_id: tripId, name: '衣物' }],
          ]);
        }
        if (sql.includes('checklist_trip_item_specs')) {
          return Promise.resolve([
            [
              {
                id: 700,
                checklist_trip_item_id: 600,
                name: '防水',
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_items')) {
          return Promise.resolve([
            [
              {
                id: 600,
                checklist_trip_category_id: 500,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([[]]);
      });
    }

    it('copies template categories/items/specs into the trip, inserts a default occasion, commits, and returns the assembled checklist', async () => {
      mockTransactionCopyFlow();
      mockFindChecklistAfterInit();

      const result = await initChecklist(tripId);

      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO checklist_trip_categories (trip_id, name) VALUES (?, ?)',
        [tripId, '衣物'],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO checklist_trip_items (checklist_trip_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
        [500, '外套', 1, null, null],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES (?, ?, ?)',
        [600, '防水', null],
      );
      expect(mockConnExecute).toHaveBeenCalledWith(
        "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')",
        [tripId],
      );
      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
      expect(result).toEqual({
        tripId,
        categories: [
          {
            id: 500,
            name: '衣物',
            items: [
              {
                id: 600,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
                specs: [{ id: 700, name: '防水', storage_location: null }],
              },
            ],
          },
        ],
        occasions: [{ id: 900, name: '收拾', checks: {} }],
      });
    });

    it('rolls back the transaction and rethrows when a query fails mid-transaction', async () => {
      mockConnExecute.mockRejectedValueOnce(new Error('db error'));

      await expect(initChecklist(tripId)).rejects.toThrow('db error');

      expect(mockConnRollback).toHaveBeenCalled();
      expect(mockConnCommit).not.toHaveBeenCalled();
    });
  });

  describe('findOrInitChecklist', () => {
    it('returns the existing checklist directly, without ever starting a transaction, when one already exists', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([[{ id: 1, trip_id: 5, name: '收拾' }]]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([[]]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findOrInitChecklist(5);

      expect(result).toEqual({
        tripId: 5,
        categories: [],
        occasions: [{ id: 1, name: '收拾', checks: {} }],
      });
      expect(mockGetConnection).not.toHaveBeenCalled();
      expect(mockConnExecute).not.toHaveBeenCalled();
    });

    it('runs the init flow and returns its result when no existing checklist is found', async () => {
      let occasionCallCount = 0;
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          occasionCallCount += 1;
          if (occasionCallCount === 1) {
            return Promise.resolve([[]]);
          }
          return Promise.resolve([[{ id: 900, trip_id: 5, name: '收拾' }]]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([[]]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([[]]);
        }
        return Promise.resolve([[]]);
      });
      mockConnExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_template_categories')) {
          return Promise.resolve([[]]);
        }
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([{ insertId: 900 }]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findOrInitChecklist(5);

      expect(mockGetConnection).toHaveBeenCalled();
      expect(mockConnExecute).toHaveBeenCalledWith(
        "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')",
        [5],
      );
      expect(mockConnCommit).toHaveBeenCalled();
      expect(result).toEqual({
        tripId: 5,
        categories: [],
        occasions: [{ id: 900, name: '收拾', checks: {} }],
      });
    });
  });
});
