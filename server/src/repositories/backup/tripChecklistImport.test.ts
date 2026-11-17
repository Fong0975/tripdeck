import type { ChecklistItem, TripChecklist } from '@tripdeck/shared';
import type { PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { importTripChecklist } from './tripChecklistImport';

const mockExecute = vi.fn();
const mockQuery = vi.fn();
const conn = {
  execute: mockExecute,
  query: mockQuery,
} as unknown as PoolConnection;

function item(id: number, name: string): ChecklistItem {
  return {
    id,
    name,
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
  };
}

/** Hands out a fresh insertId per category and item insert. */
function mockSequentialInserts() {
  let nextCategoryId = 4000;
  let nextItemId = 5000;
  mockExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('INSERT INTO checklist_trip_categories')) {
      return Promise.resolve([{ insertId: nextCategoryId++ }]);
    }
    if (sql.startsWith('INSERT INTO checklist_trip_items')) {
      return Promise.resolve([{ insertId: nextItemId++ }]);
    }
    return Promise.resolve([{ insertId: 1 }]);
  });
  mockQuery.mockResolvedValue([{ affectedRows: 1 }]);
}

function insertParams(table: string): unknown[][] {
  return mockExecute.mock.calls
    .filter(([sql]) => String(sql).startsWith(`INSERT INTO ${table}`))
    .map(([, params]) => params as unknown[]);
}

describe('importTripChecklist ordering', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockQuery.mockReset();
    mockSequentialInserts();
  });

  it('writes sort_order from the array position, ignoring the backup ids', async () => {
    // Ids are deliberately not ascending: the array order is the user's order.
    const checklist: TripChecklist = {
      tripId: 1,
      occasions: [],
      categories: [
        { id: 30, name: 'Third by id', items: [item(9, 'Z'), item(2, 'A')] },
        { id: 10, name: 'First by id', items: [item(5, 'M')] },
        { id: 20, name: 'Second by id', items: [] },
      ],
    };

    await importTripChecklist(conn, 1, 777, checklist);

    expect(insertParams('checklist_trip_categories')).toEqual([
      [777, 'Third by id', 0],
      [777, 'First by id', 1],
      [777, 'Second by id', 2],
    ]);
    expect(
      insertParams('checklist_trip_items').map(p => [p[0], p[1], p[5]]),
    ).toEqual([
      [4000, 'Z', 0],
      [4000, 'A', 1],
      [4001, 'M', 0],
    ]);
  });

  it('restarts the item order for every category', async () => {
    const checklist: TripChecklist = {
      tripId: 1,
      occasions: [],
      categories: [
        { id: 1, name: 'One', items: [item(1, 'a'), item(2, 'b')] },
        { id: 2, name: 'Two', items: [item(3, 'c'), item(4, 'd')] },
      ],
    };

    await importTripChecklist(conn, 1, 777, checklist);

    expect(insertParams('checklist_trip_items').map(p => p[5])).toEqual([
      0, 1, 0, 1,
    ]);
  });

  it('imports an empty checklist without inserting categories or items', async () => {
    await importTripChecklist(conn, 1, 777, {
      tripId: 1,
      occasions: [],
      categories: [],
    });

    expect(insertParams('checklist_trip_categories')).toEqual([]);
    expect(insertParams('checklist_trip_items')).toEqual([]);
  });
});
