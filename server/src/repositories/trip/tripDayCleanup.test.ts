import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

import { createDbMock, routeSql } from '../../test-utils/dbMocks';

import { deleteTripDaysWithContents } from './tripDayCleanup';

describe('deleteTripDaysWithContents', () => {
  const tests = [
    {
      name: 'issues no queries when there are no days to remove',
      dayIds: [] as number[],
      imageRows: [] as { filename: string }[],
      expectedFilenames: [] as string[],
      expectedStatements: [] as Array<[string, number[]]>,
    },
    {
      name: 'deletes connections, attractions and days for one day',
      dayIds: [404],
      imageRows: [{ filename: 'day404.jpg' }, { filename: 'attr1.jpg' }],
      expectedFilenames: ['day404.jpg', 'attr1.jpg'],
      expectedStatements: [
        ['SELECT filename FROM trip_day_images', [404, 404, 404, 404, 404]],
        ['DELETE FROM trip_connections', [404, 404, 404]],
        ['DELETE FROM trip_attractions', [404]],
        ['DELETE FROM trip_days', [404]],
      ] as Array<[string, number[]]>,
    },
    {
      name: 'batches several days into each statement',
      dayIds: [404, 405],
      imageRows: [{ filename: 'conn9.jpg' }],
      expectedFilenames: ['conn9.jpg'],
      expectedStatements: [
        [
          'SELECT filename FROM trip_day_images',
          [404, 405, 404, 405, 404, 405, 404, 405, 404, 405],
        ],
        ['DELETE FROM trip_connections', [404, 405, 404, 405, 404, 405]],
        ['DELETE FROM trip_attractions', [404, 405]],
        ['DELETE FROM trip_days', [404, 405]],
      ] as Array<[string, number[]]>,
    },
  ];

  it.each(tests)(
    '$name',
    async ({ dayIds, imageRows, expectedFilenames, expectedStatements }) => {
      const { conn } = createDbMock();
      routeSql(
        conn.execute,
        [['SELECT filename', [imageRows]]],
        [{ affectedRows: 1 }],
      );

      const filenames = await deleteTripDaysWithContents(
        conn as unknown as PoolConnection,
        dayIds,
      );

      expect(filenames).toEqual(expectedFilenames);
      const calls = conn.execute.mock.calls as Array<[string, number[]]>;
      expect(calls).toHaveLength(expectedStatements.length);
      expectedStatements.forEach(([sqlStart, params], index) => {
        expect(calls[index][0].trim().startsWith(sqlStart)).toBe(true);
        expect(calls[index][1]).toEqual(params);
      });
    },
  );

  it('references removed-day attractions when deleting connections', async () => {
    const { conn } = createDbMock();
    routeSql(conn.execute, [['SELECT filename', [[]]]], [{ affectedRows: 1 }]);

    await deleteTripDaysWithContents(conn as unknown as PoolConnection, [7]);

    const connectionDelete = conn.execute.mock.calls.find(([sql]) =>
      (sql as string).startsWith('DELETE FROM trip_connections'),
    );
    expect(connectionDelete?.[0]).toContain('trip_attraction_id_from IN');
    expect(connectionDelete?.[0]).toContain('trip_attraction_id_to IN');
  });
});
