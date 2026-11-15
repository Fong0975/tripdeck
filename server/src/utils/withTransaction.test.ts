import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '../config/database',
  async () => (await import('../test-utils/dbMocks')).db.module,
);

import { db } from '../test-utils/dbMocks';

import { withTransaction } from './withTransaction';

describe('withTransaction', () => {
  beforeEach(() => {
    db.pool.getConnection.mockResolvedValue(db.conn);
  });

  const tests = [
    {
      name: 'commits and returns the result when work resolves',
      work: () => Promise.resolve('ok'),
      commitError: undefined,
      expected: { result: 'ok', commit: 1, rollback: 0 },
    },
    {
      name: 'rolls back and rethrows when work rejects',
      work: () => Promise.reject(new Error('boom')),
      commitError: undefined,
      expected: { error: 'boom', commit: 0, rollback: 1 },
    },
    {
      name: 'rolls back and rethrows when commit fails',
      work: () => Promise.resolve('ok'),
      commitError: new Error('commit failed'),
      expected: { error: 'commit failed', commit: 1, rollback: 1 },
    },
  ];

  it.each(tests)('$name', async ({ work, commitError, expected }) => {
    if (commitError) {
      db.conn.commit.mockRejectedValueOnce(commitError);
    }

    const run = withTransaction(work);

    if (expected.error) {
      await expect(run).rejects.toThrow(expected.error);
    } else {
      await expect(run).resolves.toBe(expected.result);
    }
    expect(db.conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(db.conn.commit).toHaveBeenCalledTimes(expected.commit);
    expect(db.conn.rollback).toHaveBeenCalledTimes(expected.rollback);
    expect(db.conn.release).toHaveBeenCalledTimes(1);
  });

  it('passes the transaction connection to work', async () => {
    const work = vi.fn().mockResolvedValue(undefined);

    await withTransaction(work);

    expect(work).toHaveBeenCalledWith(db.conn);
  });
});
