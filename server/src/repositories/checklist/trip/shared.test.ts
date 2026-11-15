import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { lockTrip } from './shared';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;
const mockConnExecute = db.conn.execute;

describe('checklist trip shared helpers', () => {
  const existenceCases = [
    { rows: [{ id: 5 }], expected: true },
    { rows: [], expected: false },
  ];

  describe('lockTrip', () => {
    it.each(existenceCases)(
      'issues a FOR UPDATE lock and returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockConnExecute.mockResolvedValue([rows]);

        const result = await lockTrip(db.conn as unknown as PoolConnection, 5);

        expect(result).toBe(expected);
        expect(mockConnExecute).toHaveBeenCalledWith(
          'SELECT id FROM trips WHERE id = ? FOR UPDATE',
          [5],
        );
        expect(mockPoolExecute).not.toHaveBeenCalled();
      },
    );
  });
});
