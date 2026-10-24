export interface SerialQueueOptions {
  /** Minimum gap between the start of two consecutive tasks. */
  minIntervalMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface SerialQueue {
  /**
   * Runs `task` after every earlier task has finished and the minimum
   * interval has elapsed. Calls sharing a `key` while one is pending or
   * running get that same promise instead of running the task again.
   */
  enqueue<T>(key: string, task: () => Promise<T>): Promise<T>;
}

/**
 * Creates a queue that runs one task at a time with a minimum spacing, so a
 * burst of requests (e.g. one per attraction) never reaches an external API
 * all at once.
 */
export function createSerialQueue(options: SerialQueueOptions): SerialQueue {
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;

  let tail: Promise<unknown> = Promise.resolve();
  let lastStartedAt = -Infinity;
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) {
        return existing as Promise<T>;
      }

      const run = tail.then(async () => {
        const wait = lastStartedAt + options.minIntervalMs - now();
        if (wait > 0) {
          await sleep(wait);
        }
        lastStartedAt = now();
        return task();
      });
      tail = run.catch(() => undefined);

      const tracked = run.finally(() => inFlight.delete(key));
      inFlight.set(key, tracked);
      return tracked;
    },
  };
}
