import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test-utils/dbMocks';
import { mockLogger } from '../test-utils/loggerMock';

import { backfillChecklistOrder } from './backfillChecklistOrder';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockPoolExecute = db.pool.execute;

describe('backfillChecklistOrder', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockLogger.info.mockClear();
  });

  it('runs one UPDATE per ordered checklist table, in dependency order', async () => {
    mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

    await backfillChecklistOrder();

    const updatedTables = mockPoolExecute.mock.calls.map(
      ([sql]) => /^UPDATE (\w+)/.exec(sql as string)?.[1],
    );
    expect(updatedTables).toEqual([
      'checklist_template_categories',
      'checklist_template_items',
      'checklist_trip_categories',
      'checklist_trip_items',
    ]);
  });

  it.each([
    { name: 'rows were backfilled', affectedRows: 3, logged: 4 },
    { name: 'nothing needed backfilling', affectedRows: 0, logged: 0 },
  ])('logs only when $name', async ({ affectedRows, logged }) => {
    mockPoolExecute.mockResolvedValue([{ affectedRows }]);

    await backfillChecklistOrder();

    expect(mockLogger.info).toHaveBeenCalledTimes(logged);
  });

  it('only touches groups whose sort_order is still all zero', async () => {
    mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);

    await backfillChecklistOrder();

    for (const [sql] of mockPoolExecute.mock.calls) {
      expect(sql).toContain('SET sort_order = id');
      expect(sql).toMatch(/COUNT\(\*\) > 1|g\.n > 1/);
      expect(sql).toMatch(/MAX\(sort_order\) = 0|max_order = 0/);
    }
  });
});
