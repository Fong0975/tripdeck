import { describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { syncChecklistFromTemplate } from './tripChecklistSync';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../../logger', async () => {
  const { mockLogger } = await import('../../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockConnExecute = db.conn.execute;
const mockConnCommit = db.conn.commit;
const mockConnRollback = db.conn.rollback;

const tripId = 5;
const LOCK_SQL = 'SELECT id FROM trips WHERE id = ? FOR UPDATE';
const INSERT_CATEGORY_SQL =
  'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)';
const INSERT_OCCASION_SQL =
  "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')";

interface TripState {
  tripRows?: unknown[];
  categoryRows?: unknown[];
  occasionRows?: unknown[];
}

/** Mocks the locked trip's state and a one-category template. */
function mockState({
  tripRows = [{ id: tripId }],
  categoryRows = [],
  occasionRows = [],
}: TripState = {}) {
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.includes('FROM trips')) {
      return Promise.resolve([tripRows]);
    }
    if (sql.startsWith('SELECT id FROM checklist_trip_categories')) {
      return Promise.resolve([categoryRows]);
    }
    if (sql.startsWith('SELECT id FROM checklist_occasions')) {
      return Promise.resolve([occasionRows]);
    }
    if (sql.includes('checklist_template_categories')) {
      return Promise.resolve([[{ id: 1, name: '衣物' }]]);
    }
    if (sql.includes('checklist_template_')) {
      return Promise.resolve([[]]);
    }
    if (sql.includes('INSERT INTO checklist_trip_categories')) {
      return Promise.resolve([{ insertId: 500 }]);
    }
    return Promise.resolve([{ insertId: 900 }]);
  });
}

describe('syncChecklistFromTemplate', () => {
  it.each([
    {
      label: 'the trip does not exist',
      state: { tripRows: [] },
      expected: 'not_found',
      expectCopy: false,
      expectOccasion: false,
    },
    {
      label: 'the trip already has categories',
      state: { categoryRows: [{ id: 500 }] },
      expected: 'has_categories',
      expectCopy: false,
      expectOccasion: false,
    },
    {
      label: 'the trip has no checklist rows',
      state: {},
      expected: 'synced',
      expectCopy: true,
      expectOccasion: true,
    },
    {
      label: 'the trip has an occasion but no categories',
      state: { occasionRows: [{ id: 900 }] },
      expected: 'synced',
      expectCopy: true,
      expectOccasion: false,
    },
  ])(
    'locks the trip first and returns $expected when $label',
    async ({ state, expected, expectCopy, expectOccasion }) => {
      mockState(state);

      const result = await syncChecklistFromTemplate(tripId);

      const executedSql = mockConnExecute.mock.calls.map(([sql]) => sql);
      expect(result).toBe(expected);
      expect(mockConnExecute).toHaveBeenNthCalledWith(1, LOCK_SQL, [tripId]);
      expect(executedSql.includes(INSERT_CATEGORY_SQL)).toBe(expectCopy);
      expect(executedSql.includes(INSERT_OCCASION_SQL)).toBe(expectOccasion);
      expect(mockConnCommit).toHaveBeenCalled();
      expect(mockConnRollback).not.toHaveBeenCalled();
    },
  );

  it('rolls back and rethrows when a query fails mid-transaction', async () => {
    mockConnExecute.mockRejectedValueOnce(new Error('db error'));

    await expect(syncChecklistFromTemplate(tripId)).rejects.toThrow('db error');

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
  });
});
