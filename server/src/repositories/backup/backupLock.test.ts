import { describe, expect, it } from 'vitest';

import { runExclusive } from './backupLock';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets every already-queued microtask/promise callback run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('runExclusive', () => {
  it.each([
    {
      name: 'resolves',
      fail: false,
      expectedEvents: ['first:start', 'first:end', 'second:start'],
    },
    {
      name: 'rejects',
      fail: true,
      expectedEvents: ['first:start', 'second:start'],
    },
  ])(
    'starts the next task only after the previous one $name',
    async ({ fail, expectedEvents }) => {
      const events: string[] = [];
      const first = deferred();

      const firstRun = runExclusive(async () => {
        events.push('first:start');
        await first.promise;
        events.push('first:end');
        return 'first';
      });
      const secondRun = runExclusive(async () => {
        events.push('second:start');
        return 'second';
      });

      await flush();
      expect(events).toEqual(['first:start']);

      if (fail) {
        first.reject(new Error('boom'));
        await expect(firstRun).rejects.toThrow('boom');
      } else {
        first.resolve();
        await expect(firstRun).resolves.toBe('first');
      }

      await expect(secondRun).resolves.toBe('second');
      expect(events).toEqual(expectedEvents);
    },
  );

  it('runs tasks in the order they were queued', async () => {
    const order: number[] = [];

    await Promise.all(
      [1, 2, 3].map(n =>
        runExclusive(async () => {
          order.push(n);
        }),
      ),
    );

    expect(order).toEqual([1, 2, 3]);
  });
});
