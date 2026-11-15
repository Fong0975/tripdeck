import { describe, expect, it, vi } from 'vitest';

import { BULK_INSERT_CHUNK_SIZE, bulkInsert } from './bulkInsert';

function makeRows(count: number): number[][] {
  return Array.from({ length: count }, (_, i) => [i, i * 10]);
}

describe('bulkInsert', () => {
  it.each([
    { name: 'no rows', rowCount: 0, expectedChunks: [] },
    { name: 'a single row', rowCount: 1, expectedChunks: [1] },
    {
      name: 'exactly one full chunk',
      rowCount: BULK_INSERT_CHUNK_SIZE,
      expectedChunks: [BULK_INSERT_CHUNK_SIZE],
    },
    {
      name: 'more rows than one chunk',
      rowCount: BULK_INSERT_CHUNK_SIZE * 2 + 3,
      expectedChunks: [BULK_INSERT_CHUNK_SIZE, BULK_INSERT_CHUNK_SIZE, 3],
    },
  ])(
    'issues one multi-row INSERT per chunk for $name',
    async ({ rowCount, expectedChunks }) => {
      const query = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
      const rows = makeRows(rowCount);

      await bulkInsert({ query } as never, 'things', ['a', 'b'], rows);

      expect(query).toHaveBeenCalledTimes(expectedChunks.length);
      let offset = 0;
      expectedChunks.forEach((size, index) => {
        expect(query).toHaveBeenNthCalledWith(
          index + 1,
          'INSERT INTO things (a, b) VALUES ?',
          [rows.slice(offset, offset + size)],
        );
        offset += size;
      });
    },
  );

  it('propagates a failing statement', async () => {
    const error = new Error('db error');
    const query = vi.fn().mockRejectedValue(error);

    await expect(
      bulkInsert({ query } as never, 'things', ['a'], [[1]]),
    ).rejects.toBe(error);
  });
});
