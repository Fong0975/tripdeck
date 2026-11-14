import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from './concurrency';

/** Resolves after `ms` milliseconds of real time. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe('mapWithConcurrency', () => {
  it.each([
    {
      description: 'no items',
      items: [] as number[],
      limit: 4,
      expectedMaxInFlight: 0,
    },
    {
      description: 'fewer items than the limit',
      items: [30, 10],
      limit: 4,
      expectedMaxInFlight: 2,
    },
    {
      description: 'more items than the limit',
      items: [30, 5, 20, 1, 15, 2],
      limit: 2,
      expectedMaxInFlight: 2,
    },
    {
      description: 'a limit below 1',
      items: [5, 1, 3],
      limit: 0,
      expectedMaxInFlight: 1,
    },
  ])(
    'keeps input order and bounds concurrency with $description',
    async ({ items, limit, expectedMaxInFlight }) => {
      let inFlight = 0;
      let maxInFlight = 0;
      const started: number[] = [];

      const result = await mapWithConcurrency(items, limit, async (ms, i) => {
        started.push(i);
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await delay(ms);
        inFlight--;
        return ms * 10;
      });

      expect(result).toEqual(items.map(ms => ms * 10));
      expect(started).toEqual(items.map((_, i) => i));
      expect(maxInFlight).toBe(expectedMaxInFlight);
    },
  );

  it('rejects with the error thrown by the mapper', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async n => {
        if (n === 2) {
          throw new Error('boom');
        }
        return n;
      }),
    ).rejects.toThrow('boom');
  });
});
