import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';

import { createDbMock } from '../../test-utils/dbMocks';

import { countAttractionsInDay, insertWebsites } from './shared';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const db = createDbMock();
const conn = db.conn as unknown as PoolConnection;

describe('countAttractionsInDay', () => {
  it.each([
    { name: 'an empty day', count: 0 },
    { name: 'a day with attractions', count: 4 },
  ])('returns the count for $name', async ({ count }) => {
    db.conn.execute.mockResolvedValueOnce([[{ count }]]);

    await expect(countAttractionsInDay(conn, 7)).resolves.toBe(count);
    expect(db.conn.execute).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM trip_attractions WHERE trip_day_id = ?',
      [7],
    );
  });
});

describe('insertWebsites', () => {
  it.each([
    { name: 'no websites', websites: [] },
    {
      name: 'several websites in order',
      websites: [
        { url: 'https://a.com', title: 'A' },
        { url: 'https://b.com', title: 'B' },
      ],
    },
  ])('inserts one row per website for $name', async ({ websites }) => {
    db.conn.execute.mockResolvedValue([{ affectedRows: 1 }]);

    await insertWebsites(conn, 3, websites);

    expect(db.conn.execute.mock.calls).toEqual(
      websites.map(site => [
        'INSERT INTO trip_attraction_websites (trip_attraction_id, url, title) VALUES (?, ?, ?)',
        [3, site.url, site.title],
      ]),
    );
  });
});
