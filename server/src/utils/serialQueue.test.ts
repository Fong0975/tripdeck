import { describe, expect, it, vi } from 'vitest';

import { createSerialQueue } from './serialQueue';

function createFakeClock() {
  const clock = { time: 0, sleeps: [] as number[] };
  return {
    clock,
    now: () => clock.time,
    sleep: async (ms: number) => {
      clock.sleeps.push(ms);
      clock.time += ms;
    },
  };
}

describe('createSerialQueue', () => {
  it('runs tasks one at a time, in order, spaced by the minimum interval', async () => {
    const { clock, now, sleep } = createFakeClock();
    const queue = createSerialQueue({ minIntervalMs: 200, sleep, now });
    const started: string[] = [];
    const task = (name: string) => async () => {
      started.push(name);
      return name;
    };

    const results = await Promise.all([
      queue.enqueue('a', task('a')),
      queue.enqueue('b', task('b')),
      queue.enqueue('c', task('c')),
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(started).toEqual(['a', 'b', 'c']);
    expect(clock.sleeps).toEqual([200, 200]);
  });

  it('does not wait when enough time has already passed', async () => {
    const { clock, now, sleep } = createFakeClock();
    const queue = createSerialQueue({ minIntervalMs: 200, sleep, now });

    await queue.enqueue('a', async () => 1);
    clock.time += 500;
    await queue.enqueue('b', async () => 2);

    expect(clock.sleeps).toEqual([]);
  });

  it('shares one run between callers using the same key while it is pending', async () => {
    const { now, sleep } = createFakeClock();
    const queue = createSerialQueue({ minIntervalMs: 0, sleep, now });
    const task = vi.fn().mockResolvedValue('x');

    const first = queue.enqueue('k', task);
    const second = queue.enqueue('k', task);

    await expect(Promise.all([first, second])).resolves.toEqual(['x', 'x']);
    expect(task).toHaveBeenCalledTimes(1);

    await queue.enqueue('k', task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('rejects every caller sharing a failed run and keeps serving later tasks', async () => {
    const { now, sleep } = createFakeClock();
    const queue = createSerialQueue({ minIntervalMs: 0, sleep, now });
    const failing = vi.fn().mockRejectedValue(new Error('boom'));

    const first = queue.enqueue('k', failing);
    const second = queue.enqueue('k', failing);
    const later = queue.enqueue('other', async () => 'ok');

    await expect(first).rejects.toThrow('boom');
    await expect(second).rejects.toThrow('boom');
    await expect(later).resolves.toBe('ok');
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it('works with the default timer and clock', async () => {
    const queue = createSerialQueue({ minIntervalMs: 1 });

    const results = await Promise.all([
      queue.enqueue('a', async () => 1),
      queue.enqueue('b', async () => 2),
    ]);

    expect(results).toEqual([1, 2]);
  });
});
