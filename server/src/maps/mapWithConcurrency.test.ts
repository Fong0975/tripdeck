import { describe, expect, it, vi } from 'vitest';

import { mapWithConcurrency } from './mapWithConcurrency';

async function measure(items: number[], limit: number) {
  let active = 0;
  let peak = 0;
  const seen: number[] = [];
  await mapWithConcurrency(items, limit, async item => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    seen.push(item);
    active--;
  });
  return { peak, seen };
}

describe('mapWithConcurrency', () => {
  it.each([
    { limit: 1, expectedPeak: 1 },
    { limit: 3, expectedPeak: 3 },
    { limit: 10, expectedPeak: 5 },
    { limit: 0, expectedPeak: 1 },
  ])(
    'processes every item with at most $limit in flight (peak $expectedPeak)',
    async ({ limit, expectedPeak }) => {
      const { peak, seen } = await measure([1, 2, 3, 4, 5], limit);

      expect(peak).toBe(expectedPeak);
      expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
    },
  );

  it('does nothing for an empty list', async () => {
    const worker = vi.fn();

    await mapWithConcurrency([], 3, worker);

    expect(worker).not.toHaveBeenCalled();
  });
});
