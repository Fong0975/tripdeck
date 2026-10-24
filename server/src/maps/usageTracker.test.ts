import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('./config', () => ({
  getMapsConfig: () => ({ geocodeDailyLimit: 5, loadDailyLimit: 3 }),
}));

import { db, routeSql } from '../test-utils/dbMocks';

import { getUsage, markExhausted, tryConsume } from './usageTracker';

const NOW = new Date('2026-10-24T12:00:00Z'); // Pacific day 2026-10-24
const mockExecute = db.pool.execute;

function mockUsageRow(row?: { count: number; exhausted: number }) {
  routeSql(
    mockExecute,
    [['SELECT count', [row ? [row] : []]]],
    [{ affectedRows: 1 }],
  );
}

describe('usageTracker', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('getUsage', () => {
    it.each([
      {
        description: 'no row yet',
        row: undefined,
        kind: 'geocode' as const,
        expected: { used: 0, limit: 5, exhausted: false },
      },
      {
        description: 'below the limit',
        row: { count: 4, exhausted: 0 },
        kind: 'geocode' as const,
        expected: { used: 4, limit: 5, exhausted: false },
      },
      {
        description: 'at the limit',
        row: { count: 5, exhausted: 0 },
        kind: 'geocode' as const,
        expected: { used: 5, limit: 5, exhausted: true },
      },
      {
        description: 'flagged exhausted by a Google error',
        row: { count: 1, exhausted: 1 },
        kind: 'load' as const,
        expected: { used: 1, limit: 3, exhausted: true },
      },
      {
        description: 'using the load limit for load',
        row: { count: 3, exhausted: 0 },
        kind: 'load' as const,
        expected: { used: 3, limit: 3, exhausted: true },
      },
    ])('reports $description', async ({ row, kind, expected }) => {
      mockUsageRow(row);

      await expect(getUsage(kind, NOW)).resolves.toEqual(expected);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('FROM maps_usage'),
        ['2026-10-24', kind],
      );
    });

    it('defaults to the current time', async () => {
      mockUsageRow();

      await getUsage('load');

      expect(mockExecute.mock.calls[0][1][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('tryConsume', () => {
    it('counts one use and returns true while capacity remains', async () => {
      mockUsageRow({ count: 2, exhausted: 0 });

      await expect(tryConsume('geocode', NOW)).resolves.toBe(true);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE count = count + 1'),
        ['2026-10-24', 'geocode'],
      );
    });

    it.each([
      { description: 'at the limit', row: { count: 5, exhausted: 0 } },
      { description: 'flagged exhausted', row: { count: 0, exhausted: 1 } },
    ])('returns false without counting when $description', async ({ row }) => {
      mockUsageRow(row);

      await expect(tryConsume('geocode', NOW)).resolves.toBe(false);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('defaults to the current time', async () => {
      mockUsageRow();

      await expect(tryConsume('load')).resolves.toBe(true);
    });
  });

  describe('markExhausted', () => {
    it('flags today as exhausted for the kind', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await markExhausted('load', NOW);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('exhausted = 1'),
        ['2026-10-24', 'load'],
      );
    });

    it('defaults to the current time', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await markExhausted('geocode');

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
