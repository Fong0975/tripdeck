import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test-utils/dbMocks';

import { seedLocationLabels } from './seedLocationLabels';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

describe('seedLocationLabels', () => {
  beforeEach(() => {
    db.pool.execute.mockReset();
    db.pool.execute.mockResolvedValue([{ affectedRows: 2 }]);
  });

  it('inserts the default labels as groups of their own, in order', async () => {
    await seedLocationLabels();

    expect(db.pool.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = db.pool.execute.mock.calls[0] as [string, unknown[]];
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT IGNORE INTO checklist_location_labels (name, show_as_group, sort_order) VALUES (?, ?, ?), (?, ?, ?)',
    );
    expect(params).toEqual(['託運', 1, 0, '隨身', 1, 1]);
  });
});
