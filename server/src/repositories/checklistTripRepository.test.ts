import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOccasion,
  createTripCategory,
  createTripItem,
  createTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  findChecklist,
  findOrInitChecklist,
  getOccasionCount,
  initChecklist,
  setCheck,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
  verifyCategoryBelongsToTrip,
  verifyItemBelongsToTrip,
  verifyOccasionBelongsToTrip,
  verifyTripSpecBelongsToItem,
} from './checklistTripRepository';

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

describe('checklistTripRepository', () => {
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

  const verifyFunctions: Array<
    [string, (a: number, b: number) => Promise<boolean>]
  > = [
    ['verifyOccasionBelongsToTrip', verifyOccasionBelongsToTrip],
    ['verifyCategoryBelongsToTrip', verifyCategoryBelongsToTrip],
    ['verifyItemBelongsToTrip', verifyItemBelongsToTrip],
    ['verifyTripSpecBelongsToItem', verifyTripSpecBelongsToItem],
  ];

  describe.each(verifyFunctions)('%s', (_name, fn) => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await fn(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripCategory', () => {
    it('returns the created category with an empty items array', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 42 }]);

      const result = await createTripCategory(5, '衣物');

      expect(result).toEqual({ id: 42, name: '衣物', items: [] });
    });
  });

  describe('updateTripCategory', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await updateTripCategory(1, '新名稱');

        expect(result).toBe(expected);
      },
    );
  });

  describe('deleteTripCategory', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripCategory(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripItem', () => {
    it('defaults quantity/notes/storage_location to null when omitted from input', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 100 }]);

      const result = await createTripItem(10, { name: '外套' });

      expect(result).toEqual({
        id: 100,
        name: '外套',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
    });

    it('carries through quantity/notes/storage_location when provided', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 101 }]);

      const result = await createTripItem(10, {
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
      });

      expect(result).toEqual({
        id: 101,
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
        specs: [],
      });
    });
  });

  describe('deleteTripItem', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripItem(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createOccasion', () => {
    it('returns the created occasion with an empty checks map', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 900 }]);

      const result = await createOccasion(5, '出發前');

      expect(result).toEqual({ id: 900, name: '出發前', checks: {} });
    });
  });

  describe('updateOccasion', () => {
    it('returns null when the occasion does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateOccasion(999, '新名稱');

      expect(result).toBeNull();
    });

    it('updates the name and returns a checks map built from the checked=1 rows', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT * FROM checklist_occasions')) {
          return Promise.resolve([[{ id: 1, trip_id: 5, name: '舊名稱' }]]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([
            [{ checklist_trip_item_id: 100 }, { checklist_trip_item_id: 101 }],
          ]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateOccasion(1, '新名稱');

      expect(result).toEqual({
        id: 1,
        name: '新名稱',
        checks: { 100: true, 101: true },
      });
    });
  });

  describe('getOccasionCount', () => {
    it('returns the count from the query result', async () => {
      mockPoolExecute.mockResolvedValue([[{ count: 3 }]]);

      const result = await getOccasionCount(5);

      expect(result).toBe(3);
    });
  });

  describe('deleteOccasion', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteOccasion(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('updateTripItem', () => {
    const CURRENT_ITEM = {
      id: 1,
      checklist_trip_category_id: 10,
      name: '舊名稱',
      quantity: 1,
      notes: '舊備註',
      storage_location: '舊位置',
    };

    function mockSelectThenUpdate(row = CURRENT_ITEM) {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[row]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateTripItem(999, {});

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'name omitted keeps the current value',
        data: {},
        expected: CURRENT_ITEM.name,
      },
      {
        name: 'name provided as a non-empty string overrides the current value',
        data: { name: '新名稱' },
        expected: '新名稱',
      },
      {
        name: 'name provided as an empty string falls back to the current value',
        data: { name: '' },
        expected: CURRENT_ITEM.name,
      },
    ])('$name', async ({ data, expected }) => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, data);

      expect(result?.name).toBe(expected);
    });

    it('keeps the current quantity when quantity is omitted from data', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, {});

      expect(result?.quantity).toBe(CURRENT_ITEM.quantity);
    });

    it('overrides notes when notes is provided in data', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, { notes: '新備註' });

      expect(result?.notes).toBe('新備註');
    });
  });

  describe('setCheck', () => {
    it('issues an INSERT ... ON DUPLICATE KEY UPDATE when checked is true', async () => {
      mockPoolExecute.mockResolvedValue([{}]);

      await setCheck(1, 100, true);

      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE checked = 1'),
        [1, 100],
      );
    });

    it('issues a DELETE FROM checklist_checks when checked is false', async () => {
      mockPoolExecute.mockResolvedValue([{}]);

      await setCheck(1, 100, false);

      expect(mockPoolExecute).toHaveBeenCalledWith(
        'DELETE FROM checklist_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_id = ?',
        [1, 100],
      );
    });
  });

  describe('createTripItemSpec', () => {
    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await createTripItemSpec(999, { name: '防水' });

      expect(result).toBeNull();
    });

    it('inserts a spec and defaults storage_location to null when omitted', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 1 }]]);
        }
        return Promise.resolve([{ insertId: 700 }]);
      });

      const result = await createTripItemSpec(1, { name: '防水' });

      expect(result).toEqual({ id: 700, name: '防水', storage_location: null });
    });
  });

  describe('updateTripItemSpec', () => {
    const CURRENT_SPEC = {
      id: 1,
      checklist_trip_item_id: 100,
      name: '舊名稱',
      storage_location: '舊位置',
    };

    it('returns null when the spec does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateTripItemSpec(999, { name: '新名稱' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'storage_location omitted falls back to the current value',
        data: { name: '新名稱' },
        expected: CURRENT_SPEC.storage_location,
      },
      {
        name: 'storage_location provided overrides the current value',
        data: { name: '新名稱', storage_location: '新位置' },
        expected: '新位置',
      },
    ])('$name', async ({ data, expected }) => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.trim().startsWith('SELECT')) {
          return Promise.resolve([[CURRENT_SPEC]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateTripItemSpec(1, data);

      expect(result?.storage_location).toBe(expected);
    });
  });

  describe('deleteTripItemSpec', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripItemSpec(1);

        expect(result).toBe(expected);
      },
    );
  });
});
